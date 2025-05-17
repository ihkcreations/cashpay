// server/controllers/authController.js
const User = require('../models/User');
const Agent = require('../models/Agent')
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const mongoose = require('mongoose'); // For potential transactions if needed, though less critical here

// Helper function (already exists)
const formatMobileNumber = (num) => {
    num = num.replace(/^(?:\+?88)?/, '').replace(/\D/g, '');
    if (!num.startsWith('01')) return null;
    return num;
};

// @desc    Initiate user registration (Step 1 backend)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { mobileNumber } = req.body; // Only mobile number in step 1

  if (!mobileNumber) {
    return res.status(400).json({ message: 'Mobile number is required.' });
  }
   const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) {
         return res.status(400).json({ message: 'Invalid Bangladeshi mobile number format.' });
    }


  const userExists = await User.findOne({ mobileNumber: formattedMobile });

  if (userExists) {
    if (userExists.isVerified) {
         return res.status(400).json({ message: 'User already exists and is verified. Please login.' });
    } else {
        // User exists but not verified, allow to proceed to send/verify OTP
         // Optionally update their 'createdAt' or add a timestamp to signify recent attempt
         console.log(`User ${formattedMobile} already exists but unverified. Proceeding to send OTP.`);
         // We don't return a 400 error in this case, just let the send-otp endpoint handle it
         return res.status(200).json({ message: 'User exists but unverified. Proceed to send OTP.' }); // Or similar message
    }
  }

  try {
      // Create a minimal, unverified user record
      const user = await User.create({
        mobileNumber: formattedMobile,
        // pin field is not set yet
        balance: 0,
        isVerified: false, // Initially false
        role: 'user',
      });

      // After creating user, automatically send OTP
      // We can call the sendOtp logic directly or rely on the frontend
      // to call the send-otp endpoint next. Let's rely on the frontend.

      res.status(201).json({
        _id: user._id,
        mobileNumber: user.mobileNumber,
        message: 'Registration initiated. Please proceed to OTP verification.',
      });

  } catch (error) {
       console.error('Error during user registration initiation:', error);
       res.status(500).json({ message: 'Registration failed. Please try again.', error: error.message });
  }
};


// @desc    Simulate sending OTP (Used after register initiate or for resend)
// @route   POST /api/auth/send-otp
// @access  Public
// (No change needed to this controller's core logic)
// Ensure it finds the user by mobile number and proceeds if they exist and are NOT verified,
// or if they exist and *are* verified but you want to allow OTP for login recovery (not in current scope).
const sendOtp = async (req, res) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
      return res.status(400).json({ message: 'Please provide mobile number' });
  }

   const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) {
         return res.status(400).json({ message: 'Invalid Bangladeshi mobile number format.' });
    }


  const user = await User.findOne({ mobileNumber: formattedMobile });

  if (!user) {
      return res.status(404).json({ message: 'User not found with this mobile number.' });
  }
   // Prevent sending OTP if already verified and not a recovery flow
   if (user.isVerified /* && not a recovery flow */) {
        // In a real app, you might handle "Forgot PIN" with OTP here
       // For registration, if they are verified, they should log in
       return res.status(400).json({ message: 'Account already verified. Please login.' });
   }


  // --- OTP Generation Logic (Simulation) ---
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

  try {
      // Save or update OTP in database for this mobile number
      await OTP.findOneAndUpdate(
          { mobileNumber: formattedMobile },
          { otpCode, expiresAt },
          { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`\n--- SIMULATED OTP for ${formattedMobile}: ${otpCode} ---`);
      console.log(`--- OTP expires at: ${expiresAt.toLocaleString()} ---\n`);

      res.json({ message: 'OTP sent successfully. Please check server console for the code.' });

  } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.', error: error.message });
  }
};


// @desc    Verify OTP (Step 2 backend)
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { mobileNumber, otpCode } = req.body;

  if (!mobileNumber || !otpCode) {
      return res.status(400).json({ message: 'Please provide mobile number and OTP' });
  }
   const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) {
         return res.status(400).json({ message: 'Invalid Bangladeshi mobile number format.' });
    }
   if (otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
       return res.status(400).json({ message: 'Invalid OTP format. OTP must be 4 digits.' });
   }


  try {
       const otpRecord = await OTP.findOne({ mobileNumber: formattedMobile, otpCode });

       if (!otpRecord) {
           return res.status(400).json({ message: 'Invalid OTP.' });
       }

       if (otpRecord.expiresAt < new Date()) {
           await OTP.deleteOne({ _id: otpRecord._id }); // Clean up expired OTP
           return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
       }

       // OTP is valid! Find the user.
       const user = await User.findOne({ mobileNumber: formattedMobile });

       if (!user) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(404).json({ message: 'User not found.' });
       }

        // Clean up the used OTP immediately after successful validation
       await OTP.deleteOne({ _id: otpRecord._id });


       // *** IMPORTANT CHANGE ***
       // DO NOT mark user as verified or return token yet.
       // Just confirm OTP success and allow frontend to proceed to PIN setup.
       // We could potentially add a flag/timestamp to the user or a temporary
       // collection indicating "OTP verified, awaiting PIN" for extra security,
       // but for this prototype, relying on the frontend session/state is simpler.

       res.json({
         _id: user._id,
         mobileNumber: user.mobileNumber,
         message: 'OTP verified successfully. Proceed to set PIN.',
         // We might return a temp verification token here in a real app
       });

  } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ message: 'OTP verification failed. Please try again.', error: error.message });
  }
};


// @desc    Set User PIN and finalize verification (Step 3 backend)
// @route   POST /api/auth/set-pin
// @access  Public (but logically follows OTP verification)
const setPin = async (req, res) => {
    const { mobileNumber, pin } = req.body; // Mobile number and the new PIN

    if (!mobileNumber || !pin) {
        return res.status(400).json({ message: 'Mobile number and PIN are required.' });
    }

    const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) {
         return res.status(400).json({ message: 'Invalid Bangladeshi mobile number format.' });
    }

    // Validate PIN format
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        return res.status(400).json({ message: 'PIN must be exactly 5 digits.' });
    }

    try {
        // Find the user who should have passed OTP verification
        const user = await User.findOne({ mobileNumber: formattedMobile, isVerified: false });

         // *** IMPORTANT SECURITY CONSIDERATION ***
         // In a real app, you'd need a stronger link between the successful OTP verification
         // and this step, e.g., a temporary verification token issued by verifyOtp
         // and sent back here, rather than just relying on the mobile number.
         // For this prototype, we check !isVerified as a simple gate.

        if (!user) {
            // Could mean user not found, or already verified, or didn't pass OTP
            // Depending on desired flow, maybe check user.isVerified here too
            return res.status(400).json({ message: 'Account not found or already verified. Please login or register again.' });
        }

        // Set the PIN and mark as verified
        user.pin = pin; // The pre-save hook will hash the PIN
        user.isVerified = true; // Finally mark as verified
        await user.save(); // Save the user with hashed PIN

        const fullyRegisteredUser = await User.findById(user._id).select('-pin');

        // Registration is complete! Return the JWT token AND the full user object.
        res.json({
          // Directly return the user object fields, including name and dateOfBirth
          // This structure matches what AuthContext's updateUser expects
          _id: fullyRegisteredUser._id,
          mobileNumber: fullyRegisteredUser.mobileNumber,
          balance: fullyRegisteredUser.balance,
          isVerified: fullyRegisteredUser.isVerified,
          role: fullyRegisteredUser.role,
          name: fullyRegisteredUser.name,           // Include name
          dateOfBirth: fullyRegisteredUser.dateOfBirth, // Include dateOfBirth
          createdAt: fullyRegisteredUser.createdAt, // Include other fields
          updatedAt: fullyRegisteredUser.updatedAt,

          token: generateToken(user._id, user.role), // Still generate token
          message: 'PIN set and account verified successfully! You are now logged in.'
      });

    } catch (error) {
        console.error('Error setting PIN:', error);
        res.status(500).json({ message: 'Failed to set PIN. Please try again.', error: error.message });
    }
};


 // @desc    Update User Profile (Step 4 backend - happens *after* login)
 // @route   PUT /api/user/profile
 // @access  Private (requires token)
 // (Need a separate controller file/route for general user profile updates)
 // Let's add this to a new userController.js file in the next step.

// ... (loginUser, getUserProfile remain the same) ...


const loginUser = async (req, res) => {
  const { mobileNumber, pin } = req.body;

   if (!mobileNumber || !pin) {
       return res.status(400).json({ message: 'Please enter mobile number and PIN' });
   }
   const formattedMobile = formatMobileNumber(mobileNumber);
   if (!formattedMobile) return res.status(400).json({ message: 'Invalid mobile number format.' });


  const user = await User.findOne({ mobileNumber: formattedMobile });

  if (!user) {
    return res.status(404).json({ message: 'User not found with this mobile number.' });
  }

  // Case 1: Agent application approved, but PIN not yet set.
  // The `pin` field in the User model will be null or undefined.
  if (user.agentApplicationStatus === 'approved' && !user.pin) {
    // Even though frontend might not send a PIN here, or sends a dummy one,
    // this condition checks the DB state.
    return res.status(401).json({ // 401 can signify "authentication required" in a different form
        message: 'Your agent application is approved. Please set your PIN to login.',
        actionRequired: 'SET_PIN' // Hint for frontend
    });
  }

  // Case 2: Normal login attempt - PIN matching required
  if (await user.matchPin(pin)) { // matchPin correctly handles if user.pin is null
     if (!user.isVerified) {
        // This case should ideally not be hit for an agent who is 'approved' and has set a PIN,
        // as setPin also sets isVerified = true. But good as a general catch.
        return res.status(401).json({ message: 'Your account is not verified.' });
     }

     // Further checks for agent status (if role is 'agent' or applicationStatus implies agent flow)
     if (user.role === 'agent' || (user.agentApplicationStatus && user.agentApplicationStatus !== 'rejected')) {
         if (user.agentApplicationStatus !== 'approved') {
             // This means they might be 'pending_otp_verification' or 'pending_admin_approval'
             let statusMessage = 'Your agent application is still pending.';
             if (user.agentApplicationStatus === 'pending_otp_verification') statusMessage = 'Please complete OTP verification for your agent application.';
             if (user.agentApplicationStatus === 'pending_admin_approval') statusMessage = 'Your agent application is pending admin approval.';
             // We should not hit 'rejected' here if they can't login, but good to be thorough.
             if (user.agentApplicationStatus === 'rejected') statusMessage = 'Your agent application was rejected.';
             return res.status(403).json({ message: statusMessage }); // 403 Forbidden - not allowed to login yet
         }
         // If admin didn't set role to 'agent' upon approval, but status is 'approved' and PIN is now matched
         if (user.role !== 'agent' && user.agentApplicationStatus === 'approved' && user.isVerified) {
             user.role = 'agent';
             await user.save(); // Update role
         }
     }

     // Successful login
     const userToReturn = await User.findById(user._id).select('-pin');

     res.json({
       _id: userToReturn._id,
       mobileNumber: userToReturn.mobileNumber,
       balance: userToReturn.balance,
       isVerified: userToReturn.isVerified,
       role: userToReturn.role,
       name: userToReturn.name,
       dateOfBirth: userToReturn.dateOfBirth,
       shopName: userToReturn.shopName,
       district: userToReturn.district,
       area: userToReturn.area,
       nidNumber: userToReturn.nidNumber,
       agentApplicationStatus: userToReturn.agentApplicationStatus,
       token: generateToken(userToReturn._id, userToReturn.role),
       message: 'Login successful!'
     });
  } else {
    // This 'else' is now specifically for "PIN mismatch" for users who *do* have a PIN set.
    // The "user not found" and "agent needs to set PIN" cases are handled above.
    res.status(401).json({ message: 'Incorrect PIN.' });
  }
  // --- END OF MODIFIED LOGIC ---
};


// @desc    Authenticate AGENT & get token
// @route   POST /api/auth/agent/login
// @access  Public
const agentLoginUser = async (req, res) => {
    const { mobileNumber, pin } = req.body;

    if (!mobileNumber || !pin) {
        return res.status(400).json({ message: 'Mobile number and PIN are required.' });
    }
    const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) return res.status(400).json({ message: 'Invalid mobile number format.' });

    try {
        const agent = await Agent.findOne({ mobileNumber: formattedMobile });

        if (!agent) {
            return res.status(404).json({ message: 'Agent account not found with this mobile number.' });
        }

        // Check application status first
        if (agent.applicationStatus === 'pending_otp_verification') {
            return res.status(403).json({ message: 'Please complete OTP verification for your agent application.' });
        }
        if (agent.applicationStatus === 'pending_admin_approval') {
            return res.status(403).json({ message: 'Your agent application is pending admin approval.' });
        }
        if (agent.applicationStatus === 'rejected') {
            return res.status(403).json({ message: 'Your agent application was rejected.' });
        }
        if (agent.applicationStatus !== 'approved') {
            return res.status(403).json({ message: 'Agent account is not approved.' });
        }

        // If approved, check if PIN is set
        if (!agent.pin) {
            return res.status(401).json({
                message: 'Your agent application is approved. Please set your PIN to complete setup.',
                actionRequired: 'AGENT_SET_PIN' // Specific action for agent
            });
        }

        // Now match PIN
        if (await agent.matchPin(pin)) {
            if (!agent.isActive) { // Admin might have deactivated an approved agent
                return res.status(403).json({ message: 'Agent account is not active. Please contact support.' });
            }

            // Successful agent login
            const agentToReturn = await Agent.findById(agent._id).select('-pin'); // Get fresh data without PIN

            res.json({
                _id: agentToReturn._id,
                mobileNumber: agentToReturn.mobileNumber,
                name: agentToReturn.name,
                role: 'agent', // Explicitly role: 'agent'
                shopName: agentToReturn.shopName,
                district: agentToReturn.district,
                area: agentToReturn.area,
                balance: agentToReturn.balance,
                isActive: agentToReturn.isActive,
                applicationStatus: agentToReturn.applicationStatus,
                token: generateToken(agentToReturn._id, 'agent'), // Sign token with 'agent' role
                message: 'Agent login successful!'
            });
        } else {
            res.status(401).json({ message: 'Incorrect PIN.' });
        }
    } catch (error) {
        console.error("Agent Login Error:", error);
        res.status(500).json({ message: "Agent login failed. Please try again." });
    }
};

// @desc    Get user profile (for regular users and now also agents if token has 'agent' role)
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    
    if (!req.user) { // Should be caught by protect, but good check
        return res.status(404).json({ message: "Profile not found." });
    }
    res.json(req.user); // req.user is from User model via protect middleware
};


module.exports = {
  registerUser,     // Initiate registration (Step 1)
  sendOtp,          // Send OTP (Step 2 part 1)
  verifyOtp,        // Verify OTP (Step 2 part 2)
  setPin,           // Set PIN (Step 3)
  loginUser,
  agentLoginUser,
  getUserProfile,
};