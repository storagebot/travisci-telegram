'use strict';

const state = require('./state'),
      message = require('./message'),
      db = require('./db');

const { Markup } = require('telegraf');

module.exports = (bot) => {
    let module = {};

    module.handleRepoEnter = (ctx) => {
        // Just save repo and go to next state
        // Then send keyboard with repo type
        ctx.session.state = state.WAITING_FOR_REPO_TYPE;
        ctx.session.uuid = require('shortid').generate();
        ctx.session.repo = ctx.message.text;

        ctx.reply(message.WAITING_FOR_REPO_TYPE + ctx.message.text, Markup.keyboard(['Public', 'Private'], {columns: 2}).oneTime().resize().extra());
        return ctx;
    };

    module.handleRepoType = (ctx) => {
        // Get message with repo type from user. If type is 'Private' add stage with secret phrase
        // Then send keyboard for choosing target chat
        if (['Public', 'Private'].includes(ctx.message.text)) {
            if (ctx.message.text == 'Private') {
                ctx.session.state = state.WAITING_FOR_SECRET_PHRASE;
                ctx.reply(message.WAITING_FOR_SECRET_PHRASE);
            } else {
                ctx.session.state = state.WAITING_FOR_CHAT_TYPE;
                ctx.reply(message.WAITING_FOR_CHAT_TYPE + ctx.session.repo, Markup.keyboard(['Private chat', 'Group'], {columns: 2}).oneTime().resize().extra());
            }
        } else {
            ctx.reply(message.WAITING_FOR_REPO_TYPE);
        }

        return ctx;
    };

    module.handleSecretPhrase = (ctx) => {
        // Save secret phrase and go to the stage with chat type
        ctx.session.state = state.WAITING_FOR_CHAT_TYPE;
        ctx.session.secretPhrase = ctx.message.text;

        ctx.reply(message.WAITING_FOR_CHAT_TYPE + ctx.session.repo, Markup.keyboard(['Private chat', 'Group'], {columns: 2}).oneTime().resize().extra());

        return ctx;
    };

    module.handleChatType = (ctx) => {
        // Get target chat from user. If chat is 'Group' then send link for start group chat, otherwise just save repo in db
        if (['Group', 'Private chat'].includes(ctx.message.text)) {
            let id = ctx.message.text == 'Group' ? ctx.session.uuid : ctx.chat.id;
            ctx.session.state = state.DEFAULT;
            db.create(ctx.session.repo, id, ctx.session.secretPhrase).then(res => {
                if (ctx.message.text == 'Group') {
                    let payload = Buffer.from(ctx.session.repo + ':' + ctx.session.uuid).toString('base64');
                    ctx.reply(`https://t.me/${bot.options.username}?startgroup=${payload}`, Markup.removeKeyboard().extra());
                } else {
                    ctx.reply(message.SUCCESS, Markup.removeKeyboard().extra());
                }
            }).catch(err => {
                ctx.reply(message.UNEXPECTED_ERROR);
            });
        } else {
            ctx.reply(message.WAITING_FOR_CHAT_TYPE);
        }

        return ctx;
    };

    module.handleRepoDelete = (ctx) => {
        // Delete repo
        db.delete(ctx.message.text, ctx.chat.id).then(_ => {
            ctx.reply(message.SUCCESS_DELETE, Markup.removeKeyboard().extra());
        }).catch(err => {
            ctx.reply(message.UNEXPECTED_ERROR);
        });
        ctx.session.state = state.DEFAULT;

        return ctx;
    };

    module.handleStart = (ctx) => {
        ctx.reply(message.START);
        return ctx;
    };

    module.handleStartLinking = (ctx) => {
        ctx.session.state = state.WAITING_FOR_REPO;
        ctx.reply(message.WAITING_FOR_REPO);
        return ctx;
    };

    module.handleCancel = (ctx) => {
        // Reset session and remove keyboard
        ctx.session.state = state.DEFAULT;
        ctx.reply(message.START, Markup.removeKeyboard().extra());
        return ctx;
    };

    module.handleList = (ctx) => {
        db.allByChatId(ctx.chat.id).then(records => {
            let repos = records.map(record => record.repo);
            if (!repos.length) {
                ctx.reply(message.LIST_EMPTY);
            } else {
                ctx.reply(message.LIST + "\n" + repos.join("\n"));
            }
        }).catch(err => {});
        return ctx;
    };

    module.handleDelete = (ctx) => {
        db.allByChatId(ctx.chat.id).then(records => {
            let repos = records.map(record => record.repo);
            if (!repos.length) {
                ctx.reply(message.LIST_EMPTY);
            } else {
                ctx.session.state = state.WAITING_FOR_DELETING_REPO;
                ctx.reply(message.WAITING_FOR_DELETING_REPO, Markup.keyboard(records.map(record => record.repo), {columns: 2}).oneTime().resize().extra());
            }
        }).catch(err => {});
        return ctx;
    };

    module.handleStartGroup = (ctx) => {
        let data = Buffer.from(ctx.match[2], 'base64').toString('ascii').split(':');
        if (data.length != 2) {
            ctx.reply(message.UNEXPECTED_ERROR);
            ctx.leaveChat();
        } else {
            db.update(data[0], data[1], ctx.chat.id).then(res => {
                ctx.reply(message.SUCCESS);
            }).catch(err => {
                ctx.reply(message.UNEXPECTED_ERROR);
                ctx.leaveChat();
            })
        }
        return ctx;
    };

    return module;
};