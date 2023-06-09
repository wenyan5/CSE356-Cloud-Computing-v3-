const express = require("express")
const User = require("../models/User")
const Doc = require("../models/Doc")
const Image = require("../models/Image")
const login_router = express.Router()
const nodemailer = require('nodemailer');
const asyncHandler = require('express-async-handler')
var session = require('express-session')


login_router.post('/users/signup', async (req, res) => {
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    console.log("signup req.body：", req.body);

    var useGet = await User.findOne({ name: req.body.email })
    console.log("signup useGet: ", useGet);
    if (useGet != null) {
        console.log("user already exist!");
        return res.json({ error: true, message: "user already exist!" });
    } else {
        var user = new User({ name: req.body.name, email: req.body.email, password: req.body.password, verify: false });
        user.save(function (err, results) {
            if (err) return console.error(err);
            console.log(results + " saved to users collection.");
        });

        var transporter = nodemailer.createTransport({
            // host: "smtp-mail.outlook.com", // hostname
            // secureConnection: false, // use SSL
            // port: 587, // port for secure SMTP
            // auth: {
            //     user: "ccc3561@outlook.com",
            //     pass: "Aa11wwe222"
            // }
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail',
        })
        var mailOptions = {
            from: 'root@nyc1',
            to: req.body.email,
            subject: 'Sending Email using Node.js',
            text: ('http://209.94.59.121/users/verify?email=' + req.body.email + "&password=" + req.body.password + "&key=cse356GGG")
        };

        await transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        return res.json({ status: "OK" });
    }
});

login_router.get("/users/verify", async (req, res) => {
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    console.log("verify: ", req.query);
    email = req.query.email.replace(" ", "+")
    // console.log("verify: ", email);
    var myquery = { email: email };
    var newvalues = { $set: { verify: true } };
    await User.updateOne(myquery, newvalues);
    var useGet = await User.findOne({ email: email })
    // console.log("verify useGet: ", useGet);
    return res.json({ status: 'OK' });
})

login_router.post("/users/login", async (req, res, next) => {
    console.log("login:", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    let user_info = await User.findOne({ email: req.body.email });
    if (user_info != null && user_info.password == req.body.password && user_info.verify == true) {
        // console.log("currentUser: ",req.body.email);
        req.session.user = user_info;
        // res.cookie("email",req.body.email);
        console.log("succusss log in");
        res.json({ name: user_info.name });
    } else {
        console.log("can not log in");
        res.json({ error: true, message: "can not log in" });
    }

});
login_router.post("/users/logout", (req, res) => {
    console.log("logout: ", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    // res.clearCookie("name");
    req.session.destroy();
    console.log("log out");
    // res.json();
    res.redirect('/');
});


module.exports = login_router