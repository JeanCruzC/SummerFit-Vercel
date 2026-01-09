
import os
import time
from supabase import create_client
from deep_translator import GoogleTranslator
from dotenv import load_dotenv

# Load env
load_dotenv('web/.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

if not url or not key:
    print("❌ Missing credentials. Please check web/.env.local")
    exit(1)

supabase = create_client(url, key)
translator = GoogleTranslator(source='en', target='es')

def translate_text(text):
    if not text: return None
    try:
        return translator.translate(text)
    except Exception as e:
        print(f"⚠️ Translation error: {e}")
        return text

def main():
    print("🚀 Starting translation...")
    
    # 1. Fetch all exercises
    # Using pagination to handle 1700+ rows
    all_exercises = []
    count = 0
    batch_size = 100
    
    while True:
        res = supabase.table('exercises').select('*').range(count, count + batch_size - 1).execute()
        if not res.data:
            break
        all_exercises.extend(res.data)
        count += batch_size
        print(f"📥 Fetched {len(all_exercises)} exercises...")

    print(f"✨ Total exercises to process: {len(all_exercises)}")

    total = len(all_exercises)
    processed = 0

    for ex in all_exercises:
        original_title = ex['title']
        
        # Check if already processed (simple check: if title_en exists, likely done, but maybe we want to force update instructions)
        # We will assume if title_en is empty, we need to process OR if we strictly want to translate instructions
        
        # Translate Title
        title_es = translate_text(original_title)
        
        # Translate Instructions
        instructions_es = []
        if ex.get('instructions'):
            for step in ex['instructions']:
                instructions_es.append(translate_text(step))
        
        # Update Payload
        update_data = {
            'title': title_es,
            'title_en': original_title, # Save original as English title
            'instructions': instructions_es
        }

        # Perform Update
        try:
            supabase.table('exercises').update(update_data).eq('id', ex['id']).execute()
            print(f"✅ [{processed+1}/{total}] Translated: {original_title} -> {title_es}")
        except Exception as e:
            print(f"❌ Error updating {original_title}: {e}")
        
        processed += 1
        # Sleep slightly to avoid hitting translation rate limits if necessary, though GoogleTranslator is usually permissive for low volume
        # time.sleep(0.1) 

    print("🎉 Translation complete!")

if __name__ == "__main__":
    main()
