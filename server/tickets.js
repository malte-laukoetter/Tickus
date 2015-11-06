var MongoClient = require( 'mongodb' ).MongoClient,
    assert = require( 'assert' ),
    ObjectId = require( 'mongodb' ).ObjectID,
    logger = require( './logger.js' ),
    conf = require( '../config.json' ),
    users = require( './users.js' ),
    url = conf.mongodb.url,
    collection = conf.mongodb.collections.tickets;

module.exports = {
    createTicket: function ( title, message, user, callback ) {
        if(!users.hasPermission(user, "ticket.create"))
            return;

        var ticket = {
            'date': new Date(),
            'author': user,
            'status': 'todo',
            'title': title,
            'comments': [ {
                'author': user,
                'date': new Date(),
                'content': message
            } ],
            'lastModified': new Date()
        };

        MongoClient.connect( url, function ( err, db ) {
            assert.equal( null, err );

            db.collection( collection ).insertOne(
                ticket,
                function ( err, result ) {
                    assert.equal( err, null );

                    logger.verbose( 'added ticket' , {
                        ticket: ticket._id,
                        user: user._id,
                        ticketContent: ticket
                    });

                    callback( ticket );
                }
            );
        } );
    },
    createComment: function ( id, commentContent, user, callback ) {
        if(!users.hasPermission(user, "ticket.comment.create"))
            return;

        comment = {
            'content': commentContent,
            'date': new Date(),
            'author': user
        };

        MongoClient.connect( url, function ( err, db ) {
            assert.equal( null, err );

            db.collection( collection ).updateOne( {
                "_id": ObjectId( id )
            }, {
                $push: {
                    "comments": comment
                },
                $currentDate: {
                    "lastModified": true
                }
            }, function ( err, results ) {
                assert.equal( err, null );

                logger.verbose( 'created Comment', {
                    ticket: id,
                    user: user._id,
                    comment: comment
                });

                callback( {
                    'id': id,
                    'comment': comment
                } )
                db.close();
            } );
        } );
    },
    findAllComments: function ( callback ) {
        MongoClient.connect( url, function ( err, db ) {
            assert.equal( null, err );
            var cursor = db.collection( collection ).find();
            cursor.each( function ( err, doc ) {
                assert.equal( err, null );
                if ( doc != null ) {
                    callback( doc, null );
                } else {
                    callback( null, err );
                }
            } );
        } );
    },
    changeStatus: function ( id, status, user, callback ) {
        if(!users.hasPermission(user, "ticket.status.change"))
            return;

        updateTicket( id, 'status', user, status, callback );
    },
    addTag: function ( id, tag, user, callback ) {
        if(!users.hasPermission(user, "ticket.tag.add"))
            return;

        MongoClient.connect( url, function ( err, db ) {
            assert.equal( null, err );

            var newData = {};
            newData[ "tags" ] = tag;

            db.collection( collection ).updateOne( {
                "_id": ObjectId( id )
            }, {
                $addToSet: newData,
                $currentDate: {
                    "lastModified": true
                }
            }, function ( err, results ) {
                assert.equal( err, null );

                logger.verbose( 'added Tag', {
                    ticket: id,
                    user: user._id,
                    tag: tag
                });

                callback( results )
                db.close();
            } );
        } );
    },
    removeTag: function ( id, tag, user, callback ) {
        if(!users.hasPermission(user, "ticket.tag.remove"))
            return;

        MongoClient.connect( url, function ( err, db ) {
            assert.equal( null, err );

            var newData = {};
            newData[ "tags" ] = tag;

            db.collection( collection ).updateOne( {
                "_id": ObjectId( id )
            }, {
                $pull: newData,
                $currentDate: {
                    "lastModified": true
                }
            }, function ( err, results ) {
                assert.equal( err, null );

                logger.verbose( 'removed Tag', {
                    ticket: id,
                    user: user._id,
                    tag: tag
                });

                callback( results )
                db.close();
            } );
        } );
    },
    removeComment: function ( id, tag, user, callback ) {
        //TODO
    }
};


updateTicket = function ( id, key, user, value, callback ) {
    MongoClient.connect( url, function ( err, db ) {
        assert.equal( null, err );

        var newData = {};
        newData[ key ] = value;

        db.collection( collection ).updateOne( {
            "_id": ObjectId( id )
        }, {
            $set: newData,
            $currentDate: {
                "lastModified": true
            }
        }, function ( err, results ) {
            assert.equal( err, null );

            logger.verbose( 'updatet Ticket', {
                ticket: id,
                user: user._id,
                key: key,
                value: value
            });

            callback( results )
            db.close();
        } );
    } );
};
