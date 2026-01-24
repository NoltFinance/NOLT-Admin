import supabase from "../utils/supabase";

/**
 * Upload a file to Supabase Storage
 * @param file The file to upload
 * @param bucket The storage bucket name (default: "form-uploads")
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
    file: File,
    bucket: string = "form-uploads",
): Promise<{ url: string | null; error: string | null }> {
    try {
        // Generate a unique file path
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload the file
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            console.error("Error uploading file:", uploadError);
            return { url: null, error: uploadError.message };
        }

        // Get the public URL
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (err) {
        console.error("Unexpected error uploading file:", err);
        return {
            url: null,
            error: err instanceof Error ? err.message : "Failed to upload file",
        };
    }
}
