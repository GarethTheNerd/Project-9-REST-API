//Pre-reqs!
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');
const express = require('express');

const router = express.Router();

//These are our DB models. They are exposed from models/index.js
const User = require('../models').User;
const Course = require('../models').Course;

function asyncHandler(cb){
    try {
        return async(req, res, next) => {
            await cb(req, res, next);
        }
    } catch(error) {
        throw error;
    }
}

//This is used to protect authenicated routes. Pulls autentication headers and compares them with email and password from the DB
//If authenticated, we store the user on the request object and run next.
//Otherwise we throw a 401 status
const authenticateUser = async (req, res, next) => {
    const credentials = auth(req);
    
    if(credentials) {

        const userFromDb = await User.findOne({
            where: {
                emailAddress: credentials.name
            }
        })

        if(userFromDb) {
            passHash = userFromDb.password;
            if(bcrypt.compareSync(credentials.pass, passHash)) {
                //Authenication Success
                req.user = userFromDb;
                next();
            } else {
                res.status(401).end(); 
            }
        } else {
            res.status(401).end(); 
        }
        } else {
            res.status(401).end();
    }
}
//User Routes
//GET /api/users 200
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {

    const email = req.user.emailAddress;
    const userFromDb = await User.findOne({
        where: {
            emailAddress: email
        },
        attributes: { exclude: ['createdAt', 'updatedAt','password'] }
    })

    res.json(userFromDb);

}));

//POST /api/users 201
//This creates a new user. It uses Bcrypt to hash the password and regex to check the email is valid!
router.post('/users', asyncHandler( async (req, res, next) => {
    let hash = "";
    
    const emailRegex = /(?!.*\.{2})^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
    if(!emailRegex.test(req.body.emailAddress)) {
        const emailNotValid = new Error();
        emailNotValid.message = ["Email Address is missing or is not valid"];
        emailNotValid.status = 400;
        next(emailNotValid);
    } else {    
    
        const salt = bcrypt.genSaltSync(10);
        if(req.body.password) {
            hash = bcrypt.hashSync(req.body.password, salt);
        }
        
        try {
            const newUser = await User.build({
                ...req.body
            });
            newUser.password = hash;
            await newUser.save();
            res.location(`/api/users/${newUser.id}`);
            res.status(201).end();
        } catch (err) {
            const errors = err.errors.map(err => err.message);
            err.message = errors;       
            next(err);
        }
}
}));

//Course Routes
// GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', asyncHandler(async (req, res, next) => {
    const courses = await Course.findAll({
        include: [{
            model: User,
            attributes: { exclude: ['createdAt', 'updatedAt', 'password'] }
        }],
        attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    res.json(courses);
}))

// GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/courses/:id', asyncHandler(async (req, res, next) => {
    courseId = req.params.id;

    const course = await Course.findByPk(courseId,
        {include: [{
            model: User,
            attributes: { exclude: ['createdAt', 'updatedAt', 'password'] }
        }],
        attributes: { exclude: ['createdAt', 'updatedAt']}
    });
    
    if(course === null) {
        res.status(404).end();
    } else {
        res.json(course);
    }
}));
// POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
router.post('/courses', authenticateUser ,asyncHandler( async (req, res, next) => {
    try {
        const newCourse = await Course.build({
            ...req.body
        });
        await newCourse.save();
        res.location('/');
        res.status(201).end();
    } catch (err) {
        const errors = err.errors.map(err => err.message);
        err.message = errors;       
        next(err);
    }
}));

// PUT /api/courses/:id 204 - Updates a course and returns no content

router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
    courseId = req.params.id;

    const course = await Course.findByPk(courseId);

    if(course === null) {
        res.status(404).end();
    } else {

        if(course.userId != req.user.id) {
            res.status(403).end();
        } else {
            const id = req.body.id;
            const title = req.body.title;
            const description = req.body.description;
            const userId = req.body.userId;
            
            if(title != null && description != null) {
                
                course.id = id;
                course.title = title;
                course.description = description;
                course.userId = userId;

                try {
                    await course.save();
                    res.status(204).end();
                } catch (err) {
                    next(err);
                }


            } else {
                const badRequestError = new Error();
                badRequestError.status = 400;

                badRequestError.message = ["Title and description are required"]
                next(badRequestError);
            }
    }
}
}))


// DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser ,asyncHandler(async (req, res, next) => {
    courseId = req.params.id;
    
    const course = await Course.findByPk(courseId);

    if(course === null) {
        res.status(404).end();
    } else {

        if(course.userId != req.user.id) {
            res.status(403).end();
        } else {
            try {
                await course.destroy();
                res.status(204).end();
            } catch (err) {
                next(err);
            }
        }
    }
}))

module.exports = router