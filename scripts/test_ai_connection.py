#!/usr/bin/env python3
"""
Test AI connection to ensure Qwen API is working.
"""
import os
import requests
import time

# Load env
env_path = os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key, value)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")

print(f"🔍 Testing connection to: {OPENAI_BASE_URL}")
print(f"🔑 API Key present: {'Yes' if OPENAI_API_KEY else 'No'}")

if not OPENAI_API_KEY:
    print("❌ Missing OPENAI_API_KEY")
    exit(1)

url = f"{OPENAI_BASE_URL}/chat/completions"
headers = {
    "Authorization": f"Bearer {OPENAI_API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "model": "qwen-turbo",
    "messages": [{"role": "user", "content": "Return the word 'Pong' and nothing else."}],
    "temperature": 0.1,
    "max_tokens": 10
}

start = time.time()
try:
    print("🚀 Sending request...")
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    duration = time.time() - start
    
    print(f"⏱️  Duration: {duration:.2f}s")
    print(f"📡 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        content = response.json()["choices"][0]["message"]["content"]
        print(f"✅ Response: {content}")
    else:
        print(f"❌ Error: {response.text}")

except Exception as e:
    print(f"❌ Exception: {e}")
