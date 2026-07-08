import urllib.request
resp = urllib.request.urlopen('https://res.cloudinary.com/dv2yrukxi/image/upload/v1/media/trainer/certificates/consent-form-for-travelling-abroad-with-a-minor_eve7rh')
print(resp.headers)
