const Sequelize = require('sequelize');

module.exports = (sequelize) => {

    class User extends Sequelize.Model {}
    User.init({

        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        firstName: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "First name is required"
                },
                notNull: {
                    msg: "First name is required"
                }
            }
        },
        lastName: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Last name is required"
                },
                notNull: {
                    msg: "Last name is required"
                }
            }
        },
        emailAddress: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: "Email address is required"
                },
                notNull: {
                    msg: "Email address is required"
                }                
            }
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Password is required"
                },
                notNull: {
                    msg: "Password is required"
                }
            }
        },
    }, {sequelize});

    User.associate = (models) => {
        User.hasMany(models.Course);
    };


    return User;
}