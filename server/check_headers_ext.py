import urllib.request
try:
    resp = urllib.request.urlopen('https://res.cloudinary.com/dv2yrukxi/image/upload/v1/media/trainer/certificates/consent-form-for-travelling-abroad-with-a-minor_eve7rh.png')
    print("PNG Status:", resp.status)
except Exception as e:
    print("PNG Error:", str(e))

try:
    resp = urllib.request.urlopen('https://res.cloudinary.com/dv2yrukxi/image/upload/v1/media/trainer/certificates/consent-form-for-travelling-abroad-with-a-minor_eve7rh.jpg')
    print("JPG Status:", resp.status)
except Exception as e:
    print("JPG Error:", str(e))
