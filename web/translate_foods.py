
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client, Client
from deep_translator import GoogleTranslator

# Get env vars
URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not URL or not KEY:
    print("Error: Missing env vars.")
    exit(1)

supabase: Client = create_client(URL, KEY)
translator = GoogleTranslator(source='en', target='es')

def translate_and_update(food):
    try:
        text = food['name']
        # Simple cleanup
        clean_text = text.replace("Pillsbury", "").replace("Kellogg's", "").strip()
        if not clean_text: 
            return False
            
        translated = translator.translate(clean_text)
        
        if translated and translated != text:
            # Update specific row directly
            supabase.table('foods').update({'name': translated}).eq('id', food['id']).execute()
            return True
    except Exception as e:
        # print(f"Error processing {food['id']}: {e}")
        pass
    return False

def process_batch(foods):
    count = 0
    # Use threads to speed up translation AND update calls
    with ThreadPoolExecutor(max_workers=20) as executor: # Increased workers
        futures = {executor.submit(translate_and_update, f): f for f in foods}
        for future in as_completed(futures):
            try:
                if future.result():
                    count += 1
            except:
                pass
    
    print(f"✅ Translated and updated {count} items in this batch.")

def main():
    print("🚀 Starting massive food translation (Corrected V2)...")
    
    count_response = supabase.table('foods').select("id", count='exact').execute()
    total = count_response.count
    print(f"📊 Total items to translate: {total}")

    offset = 0
    BATCH_SIZE = 50 
    
    while offset < total:
        print(f"Processing batch {offset} - {offset + BATCH_SIZE}...")
        
        response = supabase.table('foods').select("id, name").range(offset, offset + BATCH_SIZE - 1).execute()
        foods = response.data
        
        if not foods:
            break
            
        process_batch(foods)
        offset += len(foods)
        
        # dynamic sleep?
        # time.sleep(0.1) 

    print("🎉 Translation finished!")

if __name__ == "__main__":
    main()
