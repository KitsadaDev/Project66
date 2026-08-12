import heic2any from "heic2any";

/**
 * Converts a file to JPEG if it is a HEIC or HEIF image.
 * Otherwise, returns the file as-is.
 * @param {File} file 
 * @returns {Promise<File>}
 */
export const convertHeicToJpeg = async (file) => {
  if (!file) return file;
  
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === "heic" || extension === "heif" || file.type === "image/heic" || file.type === "image/heif") {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8
      });
      
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
      
      return new File([blob], newName, {
        type: "image/jpeg",
        lastModified: new Date().getTime(),
      });
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      return file; // fallback to original file if conversion fails
    }
  }
  return file;
};
