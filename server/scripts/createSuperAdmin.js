// server/scripts/createSuperAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin'); // Import the new Admin model
const connectDB = require('../config/db');

// Adjust path to .env if script is in a subdirectory
dotenv.config({ path: require('path').join(__dirname, '../.env') });


const createSuperAdmin = async () => {
    await connectDB();

    const username = process.env.SUPER_ADMIN_USERNAME ;
    const password = process.env.SUPER_ADMIN_PASSWORD ;
    const name = process.env.SUPER_ADMIN_NAME ;

    try {
        const existingSuperAdmin = await Admin.findOne({ username: username, role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log(`Super admin '${username}' already exists.`);
            // Option to update password if it's different from .env
            // if (!(await existingSuperAdmin.matchPassword(password))) {
            //     existingSuperAdmin.password = password;
            //     await existingSuperAdmin.save();
            //     console.log(`Super admin '${username}' password has been updated.`);
            // }
            mongoose.disconnect();
            return;
        }

        const superAdmin = new Admin({ // Use Admin model
            username: username,
            password: password, // Mongoose pre-save hook will hash this
            name: name,
            role: 'super_admin',
            applicationStatus: 'approved', // Super admin is auto-approved
            isActive: true,                // Super admin is auto-active
        });

        await superAdmin.save();
        console.log(`Super admin '${username}' created successfully!`);
        console.log('IMPORTANT: Ensure this password is secure and preferably set via .env variables.');

    } catch (error) {
        console.error('Error creating super admin:', error);
    } finally {
        mongoose.disconnect();
    }
};

createSuperAdmin();