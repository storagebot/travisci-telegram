'use strict';

const mongoose = require('mongoose');

mongoose.Promise = require('bluebird');
let db = mongoose.createConnection(process.env.DB_URI);

const recordSchema = new mongoose.Schema({
    chatId: {
        type: String,
        require: true
    },
    repo: {
        type: String,
        required: true
    },
    secretPhrase: {
        type: String
    }
});

let Record = db.model('Record', recordSchema);

module.exports = {
    create: (repo, chatId, secretPhrase) => {
        let record = Record({
            chatId: chatId,
            repo: repo,
            secretPhrase: secretPhrase
        });
        return record.save();
    },
    delete: (repo, chatId) => {
        return Record.remove({repo: repo, chatId: chatId}).exec();
    },
    all: (repo) => {
        return Record.find({repo: repo}).lean().exec();
    },
    update: (repo, oldChatId, newChatId) => {
        return Record.findOneAndUpdate({repo: repo, chatId: oldChatId}, {$set: {chatId: newChatId}}).lean().exec();
    },
    allByChatId: (chatId) => {
        return Record.find({chatId: chatId}).lean().exec();
    }
};