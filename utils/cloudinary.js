import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return console.log("Local file path is required")
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image"
        })
        console.log("The file uploaded successfully", response.url)
        fs.unlinkSync(localFilePath)
        return response

    } catch (err) {
        fs.unlinkSync(localFilePath) //if upload got failed it will remove the file path
        return null;
    }
}

const destroyFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return console.log("File public id is required")
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image"
        })
        //check for the response
        console.log("The file deleted successfully")
        return response;
    } catch (err) {
        console.error("Error while deleting the file from cloudinary", err)
        return null;
    }
}
const destroyMultipleFromCloudinary = async (publicIds = []) => {
    try {
        for (const publicId of publicIds) {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: "image",
            });
            console.log(`Deleted ${publicId} from cloudinary`);
        }
    } catch (err) {
        console.error("Error while deleting multiple files from cloudinary", err);
    }
};
export {
    destroyFromCloudinary,
    uploadOnCloudinary,
    destroyMultipleFromCloudinary
}