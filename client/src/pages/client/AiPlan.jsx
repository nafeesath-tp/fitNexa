import React, { useState } from 'react';
import MyWorkout from './MyWorkout';
import MyDiet from './MyDiet';
import { Dumbbell, Utensils } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function AiPlan() {
  const [activeTab, setActiveTab] = useState('workout');

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* Top Tab Navigation */}
      <div className="flex justify-center border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10 pt-4 pb-0">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('workout')}
            className={cn(
              "flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'workout' 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Workout Plan
          </button>
          <button
            onClick={() => setActiveTab('diet')}
            className={cn(
              "flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'diet' 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Utensils className="w-4 h-4 mr-2" />
            Diet Plan
          </button>
        </div>
      </div>

      {/* Render Active Tab */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'workout' ? <MyWorkout /> : <MyDiet />}
      </div>
    </div>
  );
}
