
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
# Use Service Key if available to bypass RLS policies for updates
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") # Can be Qwen key
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") # Default or Custom (e.g. Qwen)
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini") # Default or Custom (e.g. qwen-turbo)

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
            "Translate the following food names/descriptions from English to Spanish. "
            "Keep the culinary context. Return ONLY a JSON array of strings. "
            "IMPORTANT: The array MUST have exactly the same number of items as the input, preserving the order.\n\n"
            f"{json.dumps(texts)}"
        )

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional culinary translator. You output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        # robust parsing
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        
        return json.loads(content)
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return None

def translate_batch_google(texts):
    """Fallback using googletrans if no API key"""
    try:
        from googletrans import Translator
        translator = Translator()
        results = []
        for text in texts:
             # Add tiny delay to avoid rate limits
            time.sleep(0.1)
            results.append(translator.translate(text, dest='es').text)
        return results
    except Exception as e:
        print(f"GoogleTrans Error: {e}")
        return None

def main():
    print("Starting Food Translation Script...")
    
    BATCH_SIZE = 40
    print(f"Starting Food Translation Script (Batch Size: {BATCH_SIZE})...")
    
    # Get total count first for progress calculation
    try:
        total_count = supabase.table('foods').select('id', count='exact', head=True).execute().count
        print(f"Total foods to process: {total_count}")
    except Exception as e:
        print(f"Error getting count: {e}")
        total_count = 8000

    while True:
        # 1. Fetch untranslated foods
        response = supabase.table('foods').select('id, name').is_('name_es', 'null').limit(BATCH_SIZE).execute()
        foods = response.data
        
        if not foods:
            print("All foods translated! Exiting.")
            break

        # Calculate progress
        try:
            current_translated = supabase.table('foods').select('id', count='exact', head=True).not_.is_('name_es', 'null').execute().count
            percent = (current_translated / total_count) * 100
            print(f"Progress: {current_translated}/{total_count} ({percent:.2f}%) - Translating batch of {len(foods)}...")
        except:
             print(f"Translating batch of {len(foods)}...")
        
        # Prepare batches
        names = [f['name'] for f in foods]
        
        translations = []
        
        if OPENAI_API_KEY:
            translations = translate_batch_openai(names)
        else:
            try:
                import googletrans
                translations = translate_batch_google(names)
            except ImportError:
                print("Error: googletrans missing")
                return

        if not translations or len(translations) != len(foods):
            print(f"Batch translation failed/mismatch (Got {len(translations) if translations else 0}/{len(foods)}). \n⚠️ Switching to robust one-by-one translation for this batch...")
            
            translations = []
            for name in names:
                try:
                    # Translate single item using same function but list of 1
                    single_res = translate_batch_openai([name]) if OPENAI_API_KEY else translate_batch_google([name])
                    if single_res and len(single_res) == 1:
                        translations.append(single_res[0])
                        print(f"  ✓ Translated: {name[:20]}... -> {single_res[0][:20]}...")
                    else:
                        print(f"  ✗ Failed individual: {name}")
                        translations.append(None) # Mark as failed/skip
                    time.sleep(0.5) # Be gentle
                except Exception as e:
                     print(f"  Error translating {name}: {e}")
                     translations.append(None)

        # Update database (handle partials from fallback)
        success_count = 0
        for i, food in enumerate(foods):
            translated_name = translations[i] if i < len(translations) else None
            
            if translated_name:
                supabase.table('foods').update({'name_es': translated_name}).eq('id', food['id']).execute()
                success_count += 1
            
        print(f"Batch processing done. Saved {success_count}/{len(foods)} items. Sleeping 1s...")
        time.sleep(1)

if __name__ == "__main__":
    main()
