
import os
import time
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local')
load_dotenv(dotenv_path)

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def translate_batch_openai(texts):
    """Translate a list of texts using OpenAI for context-aware translation"""
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL
        )
        
        prompt = (
            "Translate the following exercise descriptions from English to Spanish. "
            "Keep the fitness/gym context. Be natural and instructional. "
            "Return ONLY a JSON array of strings. "
            "IMPORTANT: The array MUST have exactly the same number of items as the input, preserving the order.\n\n"
            f"{json.dumps(texts)}"
        )

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional fitness translator. You output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        
        return json.loads(content)
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return None

def main():
    BATCH_SIZE = 20  # Smaller batches for longer texts
    print(f"🚀 Starting Exercise Description Translation (Batch Size: {BATCH_SIZE})...")
    
    # Get total count
    try:
        total_count = supabase.table('exercises').select('id', count='exact', head=True).execute().count
        print(f"Total exercises: {total_count}")
    except Exception as e:
        print(f"Error getting count: {e}")
        total_count = 1751

    while True:
        # Fetch untranslated exercises (description_es is NULL but description exists)
        response = supabase.table('exercises').select('id, description').is_('description_es', 'null').not_.is_('description', 'null').limit(BATCH_SIZE).execute()
        exercises = response.data
        
        if not exercises:
            print("✅ All exercise descriptions translated! Exiting.")
            break

        # Calculate progress
        try:
            current_translated = supabase.table('exercises').select('id', count='exact', head=True).not_.is_('description_es', 'null').execute().count
            percent = (current_translated / total_count) * 100
            print(f"📊 Progress: {current_translated}/{total_count} ({percent:.1f}%) - Translating batch of {len(exercises)}...")
        except:
            print(f"Translating batch of {len(exercises)}...")
        
        # Prepare texts
        descriptions = [e['description'] for e in exercises]
        
        # Translate
        translations = translate_batch_openai(descriptions)
        
        if not translations or len(translations) != len(exercises):
            print(f"⚠️ Batch translation failed/mismatch. Trying one-by-one...")
            
            translations = []
            for desc in descriptions:
                try:
                    single_res = translate_batch_openai([desc])
                    if single_res and len(single_res) == 1:
                        translations.append(single_res[0])
                        print(f"  ✓ Translated: {desc[:30]}...")
                    else:
                        translations.append(None)
                    time.sleep(0.5)
                except Exception as e:
                    print(f"  Error: {e}")
                    translations.append(None)

        # Update database
        success_count = 0
        for i, ex in enumerate(exercises):
            translated_desc = translations[i] if i < len(translations) else None
            
            if translated_desc:
                supabase.table('exercises').update({'description_es': translated_desc}).eq('id', ex['id']).execute()
                success_count += 1
            
        print(f"💾 Batch done. Saved {success_count}/{len(exercises)} items. Sleeping 1s...")
        time.sleep(1)

if __name__ == "__main__":
    main()
