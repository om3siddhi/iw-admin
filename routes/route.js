require("dotenv").config();
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const Tesseract = require("tesseract.js");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Revenue = require("../models/Revenue ");
const SupportMessage = require("../models/SupportMessage");
const KYC = require("../models/KycApproval");
const Blog = require("../models/Blog");
const flash = require("connect-flash");
const Religion = require("../models/Religion");
const MotherTongue = require("../models/MotherTongue");
const RestrictedWord = require("../models/RestrictedWord");
const City = require("../models/Cities");
const Height = require("../models/Height");
const KundaliMatch = require("../models/KundaliMatch");
const ExcelJS = require("exceljs")
const Country = require("../models/Country");
const Degree = require("../models/Degree");
const Plan = require("../models/Plan");
const SuccessStory = require("../models/SucessStories");
const SuccessStoryRequest = require("../models/SuccessStoryRequest");
const PromoCode = require("../models/PromoCode");
const JobSector = require("../models/JobSector");
const fs = require("fs");
const sharp = require("sharp");
const path = require("path");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { request } = require("http");
const { console } = require("inspector");




const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "A",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });


function getPermissions(adminValue) {
  if (typeof adminValue !== "number" || adminValue <= 0) {
    throw new Error("Invalid adminValue. It must be a positive number.");
  }

  const permissionMap = {
    1: "cordinator",
    2: "kyc-details",
    3: "sucess-stories",
    4: "kundali-request",
    5: "support-chat",
    6: "revenue",
    7: "download-users",
    8: "promo-code",
    9: "create-cordinator"
  };

  const permissions = adminValue
    .toString()
    .split("")
    .map((digit) => permissionMap[digit])
    .filter((permission) => permission);

  return permissions;
}




router.get("/login", async(req, res)=>{

  try {
    return res.render("login");
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});

router.get("/coordinator", async (req, res) => {

  try {

    const currUser = req.user;

  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  
  if (permissions.includes("create-cordinator")) {
    
    const coordinators = await User.find({ admin: { $gt: 0 } }).select("fullname email phone admin");
  const coordinatorList = coordinators.map((user) => ({
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    phone: user.phone,
    permissions: getPermissions(user.admin)
  }));

  res.render("cordinator", { coordinatorList });


  } else {
    req.flash("error", "Access Denied.");
    return res.redirect("/");
  }
    
  } catch (error) {
    
  }

  
});





router.post("/coordinator-create", async (req, res) => {
  const { fullname, email, phone, password } = req.body;


  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("create-cordinator")) {

      const existing = await User.findOne({ phone });
    const existing2 = await User.findOne({ email });
    if (existing) return res.status(400).send("phone already exists.");
    if (existing2) return res.status(400).send("email already exists.");

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCoordinator = new User({
      fullname,
      email,
      phone,
      address: "Cordinator",
      password: hashedPassword,
      admin: 1
    });

    await newCoordinator.save();
    res.redirect("/coordinator");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});

router.post("/coordinator-update-permissions", async (req, res) => {
  const { phone, permissions } = req.body;

  if (!phone) {
    return res.status(400).send("Phone number is required");
  }

  let adminValue = 1;

  if (permissions) {
    const digits = Array.isArray(permissions) ? permissions : [permissions];
    const uniqueSortedDigits = [...new Set(digits)].sort();
    adminValue = parseInt(uniqueSortedDigits.join(""));
  }

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissionss = getPermissions(currUser.admin);
  try {

    if (permissionss.includes("create-cordinator")) {

      const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).send("User not found");
    }

    user.admin = adminValue;
    await user.save();

    
    req.flash("error", "Permissions updated successfully!");
    res.redirect("/coordinator");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});

router.get("/", async (req, res) => {
  try {
     const currUser = req.user;
    if (currUser) {
      if (currUser.admin > 0){

        const userPermissions = getPermissions(currUser.admin);
        const blog = await Blog.findOne().sort({ createdAt: -1 });
        res.render("home", {userPermissions, currUser, blog});
      }else{
        res.redirect("/login");
      }
     
    } else {
      res.redirect("/login");
    }
    
  } catch (error) {
    console.log(error);
  }
});

router.post("/create-blog", async (req, res) => {

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("support-chat")) {

      await Blog.deleteMany(); 
  const { title, snippet, content, imageUrl } = req.body;
  await Blog.create({ title, snippet, content, imageUrl });
  res.redirect("/");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get('/kyc-details', async (req, res) => {
  



  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("kyc-details")) {

      const kycsApproved = await KYC.find({ approval: true }).populate('user');
  const kycsPending = await KYC.find({ approval: false }).populate('user');
  res.render('kyc', { kycsApproved, kycsPending });
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }



});


router.get('/restricted-words', async (req, res) => {

  const userPermissions = getPermissions(req.user.admin);
  try {
    const words = await RestrictedWord.find().sort({ word: 1 });
    res.render('restrictedWords', { words, userPermissions });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/restricted-words/add', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.redirect('/restricted-words');

  try {
    await RestrictedWord.findOneAndUpdate(
      { word: word.trim() },
      { word: word.trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.redirect('/restricted-words');
  } catch (err) {
    res.status(500).send('Error adding word');
  }
});

router.post('/restricted-words/delete/:id', async (req, res) => {
  try {
    await RestrictedWord.findByIdAndDelete(req.params.id);
    res.redirect('/restricted-words');
  } catch (err) {
    res.status(500).send('Error deleting word');
  }
});


router.post('/kyc/status', async (req, res) => {
  const { phone } = req.body;


  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("kyc-details")) {
      
      const user = await User.findOne({ phone });

      if (!user) {
        return res.render("check-kyc", { kycData: null, error: "User not found" });
      }
  
      const kyc = await KYC.findOne({ user: user._id }).populate("user");
  
      if (!kyc) {
        return res.render("check-kyc", { kycData: null, error: "KYC record not found for this user" });
      }
  
      res.render("check-kyc", { kycData: kyc, error: null });
  

    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
  
});




router.post('/kyc/approve/:id', async (req, res) => {

  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("kyc-details")) {
      const id = req.params.id;

    const kycA = await KYC.findById(id).populate('user');
    if (!kycA) return res.status(404).send('KYC not found');

    kycA.approval = true;
    await kycA.save();

    const user = await User.findById(kycA.user._id);
    if (!user) return res.status(404).send('User not found');

    user.kyc = true;
    user.adhar = kycA.imageUrl;

    await user.save();

    req.flash("error", "Kyc Approved Sucessfully!");
    res.redirect('/kyc-details');
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }


  
});

router.post('/kyc/reject/:id', async (req, res) => {

  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("kyc-details")) {

      const id = req.params.id;

    const deletedKYC = await KYC.findByIdAndDelete(id);

    if (!deletedKYC) {
      req.flash("error", "KYC record not found.");
      return res.redirect('/kyc-details');
    }

    const imageUrl= deletedKYC.imageUrl;
    if (!imageUrl) {
      req.flash("error", "Invalid request.");
      return res.redirect('/kyc-details');
    }

    const publicId = imageUrl.split("/").slice(-2).join("/").split(".")[0];

    console.log("Deleting Image with Public ID:", publicId);

    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Cloudinary Deletion Result:", result);


    req.flash("error", "KYC Rejected Successfully!");
    res.redirect('/kyc-details');
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }
});




router.post('/kyc/delete/:id', async (req, res) => {

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("kyc-details")) {

      const id = req.params.id;

    const deletedKYC = await KYC.findByIdAndDelete(id);

    if (!deletedKYC) {
      req.flash("error", "KYC record not found.");
      return res.redirect('/kyc-details');
    }

    

    await User.findByIdAndUpdate(deletedKYC.user, {
      kyc: false,
      adhar: ""
    });


    const imageUrl= deletedKYC.imageUrl;
    if (!imageUrl) {
      req.flash("error", "Invalid request.");
      return res.redirect('/kyc-details');
    }

    const publicId = imageUrl.split("/").slice(-2).join("/").split(".")[0];

    console.log("Deleting Image with Public ID:", publicId);

    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Cloudinary Deletion Result:", result);

    req.flash("success", "KYC deleted and user updated successfully.");
    res.redirect('/kyc-details');
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});




router.get("/promo-code", async (req, res) => {

  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("promo-code")) {

      const plans = await Plan.find();
    const promoCodesRaw = await PromoCode.find()
      .populate("usedBy.userId", "fullname _id") 
      .populate("usedBy.planId"); 

    const promoCodes = promoCodesRaw.map(promo => ({
      _id: promo._id,
      code: promo.code,
      discount: promo.discount,
      usedCount: promo.usedBy.length,
      usageDetails: promo.usedBy.map(use => ({
        userId: use.userId?._id,
        userName: use.userId?.fullname || "Unknown",
        plan: use.planId,
        usedAt: use.usedAt,
      }))
    }));

    res.render("promo-info", {
      promoCodes,
      plans,
    });
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }
});


router.post("/send-promo", async (req, res) => {
  const { planName, code } = req.body;

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("promo-code")) {

      const users = await User.find({ "plan.name": planName });
     const promoCode = await PromoCode.find({ "code": code });

     if(!promoCode){
      
      req.flash("error", "Promocode not exist!");
      res.redirect("/promo-code");
     }

      const discount = promoCode.discount;
    
    const updatePromises = users.map(user => {
      if (user.promoCodes.length >= 3) {
        user.promoCodes.shift(); 
      }
      user.promoCodes.push({ code, discount });
      return user.save();
    });
    

    await Promise.all(updatePromises);
    req.flash("error", "Promocode sended Sucessfully!");
    res.redirect("/promo-code");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

  
});


router.post("/create-promocode", async (req, res) => {

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("promo-code")) {
      const { code, discount } = req.body;

    if (!code || !discount) {
      return res.status(400).send("All fields are required.");
    }

    const newPromo = new PromoCode({ code, discount });
    await newPromo.save();
    req.flash("error", "Promocode Created Sucessfully!");
    res.redirect("/promo-code");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/success-stories", async(req, res)=>{



  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("sucess-stories")) {

      const pendingStories = await SuccessStoryRequest.find({ status: "Pending" })
      .populate('user', 'fullname phone email')
      .sort({ createdAt: -1 }); 

      res.render("sucess-story-request", {currUser, pendingStories});
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }



});


router.get('/user/:id', async (req, res) => {

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    res.render("userProfile", { user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).send("Server error");
  }
});


router.get('/check/:phone', async (req, res) => {


  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("kyc-details")) {

      const user = await User.findOne({ phone: req.params.phone });
      if (!user) return res.json({ status: 'not_found' });
  
      const kyc = await KYC.findOne({ user: user._id });
      if (!kyc) return res.json({ status: 'no_kyc' });
  
      res.json({
        status: kyc.approval ? 'approved' : 'pending',
        fullname: user.fullname,
        imageUrl: kyc.imageUrl
      });
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});


router.get("/kundali-requests", async (req, res) => {


  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("kundali-request")) {

      const matches = await KundaliMatch.find();
      res.render("kundali", { matches });
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});


router.post("/kundali-approve/:id", async (req, res) => {



  const { pdfLink } = req.body;



  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("kundali-request")) {

      await KundaliMatch.findByIdAndUpdate(req.params.id, {
        pdfLink,
        approved: !!pdfLink
      });
      res.redirect("/kundali-requests");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
  
});

router.get("/sucess-story-available", async (req, res)=>{

  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("sucess-stories")) {

      const SuccessStories = await SuccessStory.find();
      res.render("sucess-story-available", {SuccessStories});
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }

})

router.post('/success-story-delete/:id', async (req, res) => {

  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("sucess-stories")) {

      const storyId = req.params.id;

    const deletedStory = await SuccessStory.findByIdAndDelete(storyId);

    if (!deletedStory) {
      return res.status(404).send('Success story not found');
    }

    res.redirect('/sucess-story-available');
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }

  
});



router.get("/revenue/export/total", async (req, res) => {
  try {
    const revenues = await Revenue.find().populate("user").populate("plan");

    const planStats = {};
    revenues.forEach(entry => {
      const planName = entry.plan.name;
      if (!planStats[planName]) {
        planStats[planName] = {
          count: 0,
          total: 0,
          price: entry.plan.price
        };
      }
      planStats[planName].count++;
      planStats[planName].total += entry.amount;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Total Revenue");

    worksheet.columns = [
      { header: "Plan Name", key: "plan", width: 20 },
      { header: "Price", key: "price", width: 10 },
      { header: "Times Purchased", key: "count", width: 20 },
      { header: "Total Revenue", key: "total", width: 20 }
    ];

    for (let [plan, stats] of Object.entries(planStats)) {
      worksheet.addRow({
        plan,
        price: stats.price,
        count: stats.count,
        total: stats.total
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=total_revenue.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting total revenue:", err);
    res.status(500).send("Failed to export");
  }
});

router.get("/revenue/export/monthly", async (req, res) => {
  try {
    const revenues = await Revenue.find().populate("plan");

    const monthlyStats = {}; 

    revenues.forEach(entry => {
      const month = entry.purchasedAt.toISOString().slice(0, 7); 
      const planName = entry.plan.name;

      if (!monthlyStats[month]) monthlyStats[month] = {};
      if (!monthlyStats[month][planName]) {
        monthlyStats[month][planName] = {
          count: 0,
          total: 0,
          price: entry.plan.price
        };
      }

      monthlyStats[month][planName].count++;
      monthlyStats[month][planName].total += entry.amount;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monthly Revenue");

    worksheet.columns = [
      { header: "Month", key: "month", width: 15 },
      { header: "Plan Name", key: "plan", width: 20 },
      { header: "Price", key: "price", width: 10 },
      { header: "Times Purchased", key: "count", width: 20 },
      { header: "Total Revenue", key: "total", width: 20 }
    ];

    for (let [month, plans] of Object.entries(monthlyStats)) {
      for (let [plan, stats] of Object.entries(plans)) {
        worksheet.addRow({
          month,
          plan,
          price: stats.price,
          count: stats.count,
          total: stats.total
        });
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=monthly_revenue.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting monthly revenue:", err);
    res.status(500).send("Failed to export");
  }
});

router.get("/revenue", async (req, res) => {


  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("revenue")) {
      const revenueEntries = await Revenue.find().populate("plan");

      const revenueData = {};
      let totalRevenue = 0;
  
      
      revenueEntries.forEach(entry => {
        const planName = entry.plan.name;
        const price = entry.plan.price;
  
        if (!revenueData[planName]) {
          revenueData[planName] = {
            count: 0,
            price: price,
            total: 0
          };
        }
  
        revenueData[planName].count++;
        revenueData[planName].total += entry.amount;
        totalRevenue += entry.amount;
      });
  
      res.render("revenue", { revenueData, totalRevenue });
  
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }

});






function calculateRemainingDays(date) {
  if (!date) return "N/A";
  const today = new Date();
  const expiry = new Date(date);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? "Expired" : diffDays + " days left";
}

router.get("/download-users", async (req, res) => {


  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("download-users")) {

      const users = await User.find();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    worksheet.columns = [
      { header: "Full Name", key: "fullname", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Address", key: "address", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Plan Name", key: "planName", width: 15 },
      { header: "Plan Views", key: "planViews", width: 12 },
      { header: "Plan Contacts", key: "planContacts", width: 15 },
      { header: "Plan Interests", key: "planIntrests", width: 15 },
      { header: "Plan Shortlists", key: "planShortlis", width: 15 },
      { header: "Plan Valid Until", key: "planValidUntil", width: 20 },
      { header: "Plan Expires In", key: "planExpiresIn", width: 18 },
      { header: "Sponsorship Active", key: "sponsorshipActive", width: 18 },
      { header: "Sponsorship Expiry", key: "sponsorshipExpiry", width: 20 },
      { header: "Sponsorship Expires In", key: "sponsorshipExpiresIn", width: 22 },
    ];

    
    users.forEach(user => {
      worksheet.addRow({
        fullname: user.fullname,
        email: user.email,
        address: user.address,
        phone: user.phone,
        planName: user.plan?.name || "Free",
        planViews: user.plan?.views ?? 0,
        planContacts: user.plan?.contacts ?? 0,
        planIntrests: user.plan?.intrests ?? 0,
        planShortlis: user.plan?.shortlis ?? 0,
        planValidUntil: user.plan?.validUntil ? new Date(user.plan.validUntil).toLocaleDateString() : "N/A",
        planExpiresIn: calculateRemainingDays(user.plan?.validUntil),
        sponsorshipActive: user.sponsorship?.isActive ? "Yes" : "No",
        sponsorshipExpiry: user.sponsorship?.expiryDate ? new Date(user.sponsorship.expiryDate).toLocaleDateString() : "N/A",
        sponsorshipExpiresIn: calculateRemainingDays(user.sponsorship?.expiryDate),
      });
    });

    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");

    await workbook.xlsx.write(res);
    res.end();
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }

});

router.post('/delete-promo-code', async(req, res)=>{


  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("promo-code")) {

      const {code} = req.body;

    const promoResult = await PromoCode.deleteOne({ code: code });

    const userResult = await User.updateMany(
      {},
      { $pull: { promoCodes: { code: code } } }
    );

    req.flash("error", `Promo code ${code} deleted successfully.`);

    return res.redirect("/promo-code");
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});


router.post('/success-story/approve/:id', async (req, res) => {



  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("sucess-stories")) {

      const request = await SuccessStoryRequest.findById(req.params.id);

    if (!request) return res.status(404).send("Request not found.");

  
    await SuccessStoryRequest.findByIdAndUpdate(req.params.id, { status: "Approved" });

    
    const newStory = new SuccessStory({
      photo: request.image,
      coupleName: `${request.name} ❤️ ${request.partnerName}`,
      comment: request.quote
    });

    await newStory.save();

    res.redirect('/success-stories');
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

});

router.get("/support", async (req, res) => {


  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("support-chat")) {

      const users = await SupportMessage.aggregate([
        { $match: { isAdmin: false } },
        { $sort: { createdAt: -1 } }, 
        {
          $group: {
            _id: "$user",
            latestMessageAt: { $first: "$createdAt" }
          }
        }
      ]);
    
      const userDetails = await User.find({ _id: { $in: users.map(u => u._id) } });
      res.render("support", { users: userDetails });
       
     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }


  
  
});

router.get("/support/:userId", async (req, res) => {

  const currUser = req.user;

  if(!currUser){
   req.flash("error", "Access Denied.");
     return res.redirect("/login");
  }
   if(currUser.admin<1){
     req.flash("error", "Access Denied.");
     return res.redirect("/login");
   }
 
   const permissions = getPermissions(currUser.admin);
   try {
 
     if (permissions.includes("support-chat")) {
       
      const { userId } = req.params;
  const messages = await SupportMessage.find({ user: userId })
    .sort({ createdAt: 1 })
    .populate("user");
  res.render("support-chat", { messages, userId });

     } else {
       req.flash("error", "Access Denied.");
       return res.redirect("/");
     }
 
     
   } catch (error) {
     console.error("Error fetching :", error);
     res.status(500).json({ message: "Server error", error: error.message });
   }


  
});


router.post("/support/:userId", async (req, res) => {


  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("support-chat")) {

      const { userId } = req.params;
      const { message } = req.body;
    
      if (!message) return res.redirect(`/support/${userId}`);
    
      await SupportMessage.create({
        user: userId,
        message,
        isAdmin: true
      });
    
      res.redirect(`/support/${userId}`);
      
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }



 
});


router.post('/success-story/reject/:id', async (req, res) => {

  const currUser = req.user;

 if(!currUser){
  req.flash("error", "Access Denied.");
    return res.redirect("/login");
 }
  if(currUser.admin<1){
    req.flash("error", "Access Denied.");
    return res.redirect("/login");
  }

  const permissions = getPermissions(currUser.admin);
  try {

    if (permissions.includes("sucess-stories")) {
      await SuccessStoryRequest.findByIdAndUpdate(req.params.id, { status: "Rejected" });
      res.redirect('/success-stories');
    } else {
      req.flash("error", "Access Denied.");
      return res.redirect("/");
    }

    
  } catch (error) {
    console.error("Error fetching :", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      req.flash("error", "Server error. Please try again.");
      return res.redirect("/");
    }
    if (!user) {
      req.flash("error", info.message);
      return res.redirect("/");
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login failed:", err);
        req.flash("error", "Login failed. Please try again.");
        return res.redirect("/");
      }

      res.redirect("/");
    });
  })(req, res, next);
});

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.redirect("/");
  });
});

module.exports = router;
