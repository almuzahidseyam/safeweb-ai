import urllib.request
import os

model_dir = 'model'
if not os.path.exists(model_dir):
    os.makedirs(model_dir)

base_url = "https://cdn.jsdelivr.net/npm/nsfwjs@4.4.0/dist/models/mobilenet_v2_mid/"

files = ["model.json", "group1-shard1of2.min.js", "group1-shard2of2.min.js", "model.min.js"]

for f in files:
    try:
        print(f"Downloading {f}...")
        # Note: on jsdelivr the actual files are just named exactly as requested
        urllib.request.urlretrieve(base_url + f, os.path.join(model_dir, f))
    except Exception as e:
        print(f"Failed {f}: {e}")

print("Done!")
