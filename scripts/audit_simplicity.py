import json
import re

def audit_simplicity(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    report = {
        "total": 0,
        "simple_verified": 0,
        "suspicious": [],
        "reasons": {}
    }

    suspicious_terms = ["salsa", "azucar", "jarabe", "endulzante", "frito", "edulcorante", "hidrogenado"]
    processed_files = []

    for cat in data['categories']:
        for sub in cat['subcategories']:
            for item in sub['items']:
                report["total"] += 1
                name = item['name'].lower()
                tags = item.get('tags', [])
                
                # Logic to determine "Why simple"
                reason = "Unknown"
                is_simple = True
                
                # Check suspicious terms
                if any(term in name for term in suspicious_terms):
                    is_simple = False
                    report["suspicious"].append(item['name'])
                    reason = "Contains suspicious additive keywords"
                elif "fresh" in tags:
                    reason = "Ingrediente crudo/fresco (Natural)"
                elif "frozen" in tags and "100" in name:
                    reason = "Congelado 100% puro (Sin procesamiento)"
                elif "min_processed" in tags:
                    reason = "Mínimamente procesado (Seco/Deshidratado simple)"
                elif len(name.split()) <= 2:
                    reason = "Nombre corto (Probable ingrediente base)"
                else:
                    reason = "Ingrediente compuesto simple"

                # Store result
                if is_simple:
                    report["simple_verified"] += 1
                    report["reasons"][reason] = report["reasons"].get(reason, 0) + 1
                    
                    # Add tag to item (in memory)
                    item['simplicity_label'] = reason
                    item['simplicity_verified'] = True

    # Output stats
    print(f"📊 Audit Report for {file_path}")
    print(f"Total Items: {report['total']}")
    print(f"✅ Verified Simple: {report['simple_verified']} ({report['simple_verified']/report['total']*100:.1f}%)")
    
    # Save labeled file
    output_path = file_path.replace('.json', '_labeled.json')
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved labeled file to: {output_path}")

if __name__ == "__main__":
    audit_simplicity('/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/WHOLE/simple_foods_peru_mega.json')
