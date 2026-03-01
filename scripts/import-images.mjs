import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Load env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // OR service_role key for admin access

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const IMPORT_DIR = path.join(process.cwd(), 'public', 'import-dishes');
const PROCESSED_DIR = path.join(IMPORT_DIR, 'processed');

// Ensure directories exist
if (!fs.existsSync(IMPORT_DIR)) fs.mkdirSync(IMPORT_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

async function processImages() {
    console.log(`Scanning ${IMPORT_DIR} for new images...`);

    const files = fs.readdirSync(IMPORT_DIR).filter(file => {
        return fs.statSync(path.join(IMPORT_DIR, file)).isFile() &&
            /\.(jpg|jpeg|png|webp)$/i.test(file);
    });

    if (files.length === 0) {
        console.log('No new images found.');
        return;
    }

    for (const file of files) {
        const filePath = path.join(IMPORT_DIR, file);
        const fileName = path.parse(file).name;
        // Format name (e.g., "chicken-tikka" -> "Chicken Tikka")
        const productName = fileName
            .split(/[-_]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        console.log(`Processing: ${file} as product "${productName}"`);

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const fileExt = path.extname(file);
            const uniqueFileName = `${Date.now()}-${file}`;

            // 1. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('dish-images')
                .upload(uniqueFileName, fileBuffer, {
                    contentType: `image/${fileExt.substring(1)}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('dish-images')
                .getPublicUrl(uniqueFileName);

            // 3. Insert into Database
            const { error: dbError } = await supabase.from('dishes').insert({
                name: productName,
                description: `Delicious ${productName} prepared fresh.`,
                selling_price: 150, // Default simple price
                image_url: publicUrl,
                stock_quantity: 10,
                is_available: true,
                category: 'Imported'
            });

            if (dbError) {
                // Since we don't have a service_role key configured yet, inserts might fail if RLS isn't open
                // Wait, the RLS policy says "Managers can insert dishes", so this script needs manager auth 
                // or a service_role key to bypass RLS.
                throw new Error(`Database error: ${dbError.message}`);
            }

            console.log(`✅ Successfully added ${productName} to database.`);

            // 4. Move to processed folder
            fs.renameSync(filePath, path.join(PROCESSED_DIR, file));

        } catch (err) {
            console.error(`❌ Failed to process ${file}:`, err.message);
        }
    }
}

// Run immediately 
processImages();
