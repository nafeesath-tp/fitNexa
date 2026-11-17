import logging
from celery import shared_task, current_app
from django.db import transaction

from .models import AIPlanRequest
from .services import generate_ai_plan

logger = logging.getLogger(__name__)

# Completed / reviewed terminal statuses that must NEVER be downgraded
TERMINAL_STATUSES = [
    AIPlanRequest.Status.GENERATED,
    AIPlanRequest.Status.TRAINER_REVIEWED,
    AIPlanRequest.Status.ASSIGNED,
]


def is_task_actively_running(request_id):
    """
    Inspects active, reserved, and scheduled Celery worker queues to determine
    if generate_ai_plan_task(request_id) is currently executing or awaiting execution.

    Safety rules:
      - Active & reserved entries store task info directly in the entry dictionary.
      - Scheduled entries store task info nested inside entry["request"]. Both formats are supported.
      - If task is detected in any pool, returns True.
      - If any required pool inspection call returns None (partial inspection failure or timeout),
        returns None rather than False, so the recovery caller does not assume task absence.
      - Returns False ONLY when all three pools (active, reserved, scheduled) provided valid
        responses and the target task is absent across all workers.
    """
    try:
        inspector = current_app.control.inspect(timeout=1.5)
        if inspector is None:
            logger.warning(f"[Celery] Inspector could not connect to broker to inspect active tasks.")
            return None

        active = inspector.active()
        reserved = inspector.reserved()
        scheduled = inspector.scheduled()

        # Normalize target request_id for robust comparison
        req_id_str = str(request_id).strip()
        try:
            req_id_int = int(request_id)
        except (ValueError, TypeError):
            req_id_int = None

        # Inspect all available pools
        for pool in [active, reserved, scheduled]:
            if not isinstance(pool, dict):
                continue
            for worker_name, tasks in pool.items():
                if not isinstance(tasks, list):
                    continue
                for t in tasks:
                    if not isinstance(t, dict):
                        continue

                    # Celery scheduled entries nest task info inside t["request"]
                    task_info = t.get("request") if isinstance(t.get("request"), dict) else t
                    task_name = str(task_info.get("name") or t.get("name") or "")
                    if "generate_ai_plan_task" not in task_name:
                        continue

                    # Celery args can be list, tuple, or string representation
                    raw_args = task_info.get("args") if "args" in task_info else (t.get("args") or [])
                    if isinstance(raw_args, str):
                        import ast
                        try:
                            raw_args = ast.literal_eval(raw_args)
                        except Exception:
                            raw_args = [raw_args]

                    for arg in (raw_args if isinstance(raw_args, (list, tuple)) else [raw_args]):
                        arg_str = str(arg).strip()
                        if arg_str == req_id_str:
                            return True
                        if req_id_int is not None:
                            try:
                                if int(arg) == req_id_int:
                                    return True
                            except (ValueError, TypeError):
                                pass

                    # Celery kwargs can be dict or string representation
                    raw_kwargs = task_info.get("kwargs") if "kwargs" in task_info else (t.get("kwargs") or {})
                    if isinstance(raw_kwargs, str):
                        import ast
                        try:
                            raw_kwargs = ast.literal_eval(raw_kwargs)
                        except Exception:
                            raw_kwargs = {}

                    if isinstance(raw_kwargs, dict):
                        kwarg_val = raw_kwargs.get("request_id")
                        if kwarg_val is not None:
                            kwarg_str = str(kwarg_val).strip()
                            if kwarg_str == req_id_str:
                                return True
                            if req_id_int is not None:
                                try:
                                    if int(kwarg_val) == req_id_int:
                                        return True
                                except (ValueError, TypeError):
                                    pass

        # If any inspection pool returned None (partial inspection failure/timeout),
        # return None to prevent treating partial results as proof of task absence.
        if active is None or reserved is None or scheduled is None:
            logger.warning(
                f"[Celery] Incomplete inspection: active={'ok' if active is not None else 'None'}, "
                f"reserved={'ok' if reserved is not None else 'None'}, "
                f"scheduled={'ok' if scheduled is not None else 'None'}. Returning None."
            )
            return None

        # All three pools responded successfully and the task was not found anywhere
        return False

    except Exception as exc:
        logger.warning(f"[Celery] Worker inspection raised exception: {exc}")
        return None


@shared_task
def generate_ai_plan_task(request_id):
    """
    Background Celery task to generate AI workout and diet plans for a given AIPlanRequest.

    Key Safety Principles:
      1. Terminal Status Protection: Never overwrite or downgrade requests that are
         already GENERATED, TRAINER_REVIEWED, or ASSIGNED.
      2. Duplicate Execution Prevention: Only PENDING requests are permitted to transition
         to GENERATING. An actively GENERATING request is never terminated or re-processed.
      3. Plan Integrity: BOTH workout_plan and diet_plan must exist before completion.
      4. Safe Exception Handling: Only in-progress (PENDING or GENERATING) requests can transition
         to GENERATION_FAILED on error, protecting completed or reviewed plans.
    """
    logger.info(f"[Celery] Starting AI plan generation task for request_id={request_id}")

    try:
        # Atomic lock to check status and transition PENDING -> GENERATING
        with transaction.atomic():
            try:
                ai_request = AIPlanRequest.objects.select_for_update().get(id=request_id)
            except AIPlanRequest.DoesNotExist:
                logger.error(f"[Celery] AIPlanRequest id={request_id} does not exist.")
                return {"success": False, "error": f"AIPlanRequest id={request_id} not found"}

            # 1. Terminal Status Protection:
            # If already GENERATED, TRAINER_REVIEWED, or ASSIGNED, preserve status completely.
            # Never overwrite or downgrade already completed or reviewed requests.
            if ai_request.status in TERMINAL_STATUSES:
                logger.info(
                    f"[Celery] AIPlanRequest id={request_id} is already in terminal status '{ai_request.status}'. "
                    f"Preserving status and skipping duplicate execution."
                )
                return {
                    "success": True,
                    "request_id": ai_request.id,
                    "status": ai_request.status,
                    "message": f"Request is already in terminal status '{ai_request.status}'",
                }

            # 2. In-flight Protection:
            # If status is GENERATING, a worker is actively processing it.
            # Do NOT terminate it, do NOT mark it failed, and do NOT start duplicate generation.
            if ai_request.status == AIPlanRequest.Status.GENERATING:
                logger.warning(
                    f"[Celery] AIPlanRequest id={request_id} is currently in status 'GENERATING' "
                    f"by an active worker. Skipping duplicate execution."
                )
                return {
                    "success": False,
                    "request_id": ai_request.id,
                    "status": ai_request.status,
                    "error": f"Request {request_id} is already being generated by an active worker",
                }

            # 3. Only PENDING requests are eligible to start generation
            if ai_request.status != AIPlanRequest.Status.PENDING:
                logger.warning(
                    f"[Celery] AIPlanRequest id={request_id} is in status '{ai_request.status}' "
                    f"(expected PENDING). Skipping execution."
                )
                return {
                    "success": False,
                    "request_id": ai_request.id,
                    "status": ai_request.status,
                    "error": f"Request {request_id} is in status '{ai_request.status}', expected PENDING",
                }

            # Atomically mark as GENERATING
            ai_request.status = AIPlanRequest.Status.GENERATING
            ai_request.error_message = ""
            ai_request.save(update_fields=["status", "error_message"])

        # Execute plan generation service (outside select_for_update to avoid long DB row locks during API call)
        generate_ai_plan(ai_request)

        # Refresh from database and verify BOTH plans exist
        ai_request.refresh_from_db()
        if not (ai_request.workout_plan and ai_request.diet_plan):
            error_msg = "Generation completed but workout or diet plan is missing."
            logger.error(f"[Celery] {error_msg} for request_id={request_id}")
            ai_request.status = AIPlanRequest.Status.GENERATION_FAILED
            ai_request.error_message = error_msg
            ai_request.save(update_fields=["status", "error_message"])
            return {
                "success": False,
                "request_id": ai_request.id,
                "error": error_msg,
                "status": ai_request.status,
            }

        # Request is verified to have BOTH plans and is in GENERATED status
        if ai_request.status != AIPlanRequest.Status.GENERATED:
            ai_request.status = AIPlanRequest.Status.GENERATED
            ai_request.error_message = ""
            ai_request.save(update_fields=["status", "error_message"])

        logger.info(
            f"[Celery] Successfully completed AI plan generation for request_id={request_id}. "
            f"Status: {ai_request.status}, WorkoutPlan: {ai_request.workout_plan_id}, DietPlan: {ai_request.diet_plan_id}"
        )
        return {
            "success": True,
            "request_id": ai_request.id,
            "status": ai_request.status,
            "workout_plan_id": ai_request.workout_plan_id,
            "diet_plan_id": ai_request.diet_plan_id,
        }

    except Exception as exc:
        logger.exception(f"[Celery] AI plan generation failed for request_id={request_id}: {exc}")

        # Ensure we ONLY update in-progress requests (PENDING or GENERATING) to GENERATION_FAILED.
        # NEVER overwrite completed (GENERATED), reviewed (TRAINER_REVIEWED), or assigned (ASSIGNED) requests.
        try:
            AIPlanRequest.objects.filter(
                id=request_id,
                status__in=[
                    AIPlanRequest.Status.PENDING,
                    AIPlanRequest.Status.GENERATING,
                ],
            ).update(
                status=AIPlanRequest.Status.GENERATION_FAILED,
                error_message=str(exc),
            )
        except Exception as save_err:
            logger.error(
                f"[Celery] Failed to update error status for request_id={request_id}: {save_err}"
            )

        return {
            "success": False,
            "request_id": request_id,
            "error": str(exc),
            "status": AIPlanRequest.Status.GENERATION_FAILED,
        }


def recover_abandoned_ai_plan_request(request_id, min_age_seconds=300):
    """
    Controlled recovery mechanism for requests that may have been abandoned
    due to unexpected worker process termination.

    Safety rules:
      1. Preserves terminal statuses (GENERATED, TRAINER_REVIEWED, ASSIGNED).
      2. If both plans were already saved, marks GENERATED without re-calling Gemini.
      3. Celery worker inspection runs OUTSIDE database transactions to avoid holding
         PostgreSQL row locks during network I/O.
      4. If inspection fails or times out (is_running is None), holds status without assuming crash.
         An unsuccessful inspection is NEVER treated as proof that the worker crashed.
      5. If confirmed NOT running (is_running is False), reacquires database lock, re-verifies
         status and updated_at, and marks GENERATION_FAILED so the user/trainer can cleanly regenerate.
    """
    try:
        ai_request = AIPlanRequest.objects.get(id=request_id)
    except AIPlanRequest.DoesNotExist:
        return {"recovered": False, "error": f"Request {request_id} not found"}

    # 1. Never alter terminal statuses
    if ai_request.status in TERMINAL_STATUSES:
        return {
            "recovered": False,
            "status": ai_request.status,
            "action": "preserved_terminal_status",
        }

    # 2. If both plans already exist, mark GENERATED safely (preserves work, zero duplicate AI calls)
    if ai_request.workout_plan and ai_request.diet_plan:
        with transaction.atomic():
            ai_req_lock = AIPlanRequest.objects.select_for_update().get(id=request_id)
            if ai_req_lock.status not in TERMINAL_STATUSES:
                ai_req_lock.status = AIPlanRequest.Status.GENERATED
                ai_req_lock.error_message = ""
                ai_req_lock.save(update_fields=["status", "error_message"])
        return {
            "recovered": True,
            "status": AIPlanRequest.Status.GENERATED,
            "action": "completed_with_existing_plans",
        }

    # 3. Only in GENERATING status can an abandoned request be evaluated
    if ai_request.status != AIPlanRequest.Status.GENERATING:
        return {
            "recovered": False,
            "status": ai_request.status,
            "action": "no_action_needed",
        }

    from django.utils import timezone
    now = timezone.now()
    age_seconds = (now - ai_request.updated_at).total_seconds()

    # If within grace period, let it run undisturbed
    if age_seconds < min_age_seconds:
        return {
            "recovered": False,
            "status": ai_request.status,
            "action": "within_grace_period",
        }

    initial_updated_at = ai_request.updated_at

    # 4. Perform worker inspection OUTSIDE the database transaction
    is_running = is_task_actively_running(request_id)

    # Active worker confirmed: do NOT touch the task
    if is_running is True:
        logger.info(
            f"[Celery] AIPlanRequest id={request_id} is actively executing on a live worker. Leaving untouched."
        )
        return {
            "recovered": False,
            "status": ai_request.status,
            "action": "active_worker_detected",
        }

    # Worker inspection failed or timed out: NEVER assume crash
    if is_running is None:
        logger.warning(
            f"[Celery] Worker inspection timed out or unreachable for request_id={request_id}. "
            f"Holding status without assuming crash."
        )
        return {
            "recovered": False,
            "status": ai_request.status,
            "action": "inspection_failed_held",
        }

    # 5. Inspection confirmed False (workers responded and confirmed task is NOT running):
    # Reacquire database lock and re-verify state before modifying
    with transaction.atomic():
        ai_req = AIPlanRequest.objects.select_for_update().get(id=request_id)

        # Explicit status safeguard: only GENERATING requests can transition to GENERATION_FAILED
        if ai_req.status != AIPlanRequest.Status.GENERATING:
            return {
                "recovered": False,
                "status": ai_req.status,
                "action": "status_changed_during_inspection",
            }

        # Check if terminal statuses were reached during inspection
        if ai_req.status in TERMINAL_STATUSES:
            return {
                "recovered": False,
                "status": ai_req.status,
                "action": "preserved_terminal_status",
            }

        # Check if plans were saved during inspection
        if ai_req.workout_plan and ai_req.diet_plan:
            ai_req.status = AIPlanRequest.Status.GENERATED
            ai_req.error_message = ""
            ai_req.save(update_fields=["status", "error_message"])
            return {
                "recovered": True,
                "status": ai_req.status,
                "action": "completed_with_existing_plans",
            }

        # Check if updated_at changed (active progress while inspection was running)
        if ai_req.updated_at > initial_updated_at:
            return {
                "recovered": False,
                "status": ai_req.status,
                "action": "active_worker_progress_detected",
            }

        # Confirmed genuinely abandoned: safely transition to GENERATION_FAILED
        ai_req.status = AIPlanRequest.Status.GENERATION_FAILED
        ai_req.error_message = (
            "Previous generation worker terminated unexpectedly. Request marked as failed for safe regeneration."
        )
        ai_req.save(update_fields=["status", "error_message"])
        logger.info(f"[Celery] Recovered abandoned AIPlanRequest id={request_id} -> GENERATION_FAILED")
        return {
            "recovered": True,
            "status": ai_req.status,
            "action": "marked_for_regeneration",
        }
