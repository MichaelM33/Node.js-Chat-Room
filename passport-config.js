const { authenticate } = require('passport')

const LocalStrategy = require('passport-local').Strategy

const mongoose = require('mongoose');

const bcrypt = require('bcrypt')


const User = require('./models/User');



module.exports = function(passport){

    passport.use(new LocalStrategy({ usernameField: 'username'}, authenticateUser))


    passport.serializeUser((user, done) => done(null, user.id))

    passport.deserializeUser((id, done) => {User.findById(id, (err, user) => done(err, user)
        )});
}


    const authenticateUser = async (username, password, done) =>  {
        User.findOne({username: username})
        .then(user => {
            if(!user){
                return done(null, false, {message: 'No user with that username'});
            }
            //Match password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if(err) throw err;

                if(isMatch){
                    return done(null, user)
                }
                else {
                    return done(null, false, {message: 'password incorrect'})
                }
            })
        })
        .catch(err => console.log(err))

    }






