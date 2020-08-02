const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');

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
                console.log(`Authenication Success`);
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
router.post('/users', asyncHandler( async (req, res, next) => {
    let hash = "";
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
        res.location('/');
        res.status(201).end();
    } catch (err) {
        const errors = err.errors.map(err => err.message);
        err.message = errors;       
        next(err);
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

            badRequestError.message = "Title and description are required"
            next(badRequestError);
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
        try {
            await course.destroy();
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    }
}))

module.exports = router