const multer = require("multer");
const { supabase } = require("../integrations/supabaseClient");

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");

const uploadProfilePicture = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ message: err.message });

    const file = req.file;
    const fileName = `${req.user._id}/${Date.now()}-${file.originalname}`;

    const { data, error } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, file.buffer);
    if (error) return res.status(500).json({ message: error.message });

    const { publicUrl } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(fileName);

    // Save to user
    await User.findByIdAndUpdate(req.user._id, { profilePicture: publicUrl });

    res.json({ url: publicUrl });
  });
};

module.exports = { uploadProfilePicture };
