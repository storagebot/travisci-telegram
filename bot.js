'use strict';

// States
const states = {
    DEFAULT: undefined,
    WAITING_FOR_REPO: 0,
    WAITING_FOR_CHAT_TYPE: 1,
    WAITING_FOR_REPO_TYPE: 2,
    WAITING_FOR_SECRET_PHRASE: 3,
    WAITING_FOR_START: 4,
};

// Messages
const msg = {
    START: `I'm a Travis CI bot. I can notify you about builds of your repositories.`,
    WAITING_FOR_REPO: `Please, send a repository name you'd like to receive build notifications from.`,
    WAITING_FOR_REPO_TYPE: `Please, choose access level for `,
    WAITING_FOR_CHAT_TYPE: `Please, choose where you would like to receive build notifications from `,
    WAITING_FOR_SECRET_PHRASE: `Please, type secret phrase.`,
    SUCCESS: 'Success',
    UNEXPECTED_ERROR: 'Unexpected error occurred, try again.'
};

const Telegraf = require('telegraf'),
      { Extra, Markup } = require('telegraf'),
      db = require('./db'),
      uuid = require('uuid/v4'),
      express = require("express")(),
      bodyParser = require('body-parser');

const TOKEN = process.env.BOT_TOKEN || '';
const URL = process.env.URL || 'https://your-app-url.com';
const PORT = process.env.PORT || 8443;

const bot = new Telegraf(TOKEN);
bot.use(Telegraf.memorySession());

bot.telegram.setWebhook(`${URL}/telegram-webhook`);
express.use(bot.webhookCallback('/telegram-webhook'));
express.use(bodyParser.urlencoded({ extended: false }));
express.use(bodyParser.json());

bot.command('start', (ctx) => {
    ctx.reply(msg.START);
});

bot.command('link', (ctx) => {
    ctx.session.state = states.WAITING_FOR_REPO;
    ctx.reply(msg.WAITING_FOR_REPO);
});

bot.command('cancel', (ctx) => {
    ctx.session.state = states.DEFAULT;
    ctx.reply(msg.START);
});

bot.hears(/\/start@([^ ]+) (.*)/, (ctx) => {
    let data = Buffer.from(ctx.match[2], 'base64').toString('ascii').split(':');
    if (data.length != 2) {
        ctx.reply(msg.UNEXPECTED_ERROR);
        ctx.leaveChat();
    } else {
        db.update(data[0], data[1], ctx.chat.id).then(res => {
            ctx.reply(msg.SUCCESS);
        }).catch(err => {
            console.log(err);
            ctx.reply(msg.UNEXPECTED_ERROR);
            ctx.leaveChat();
        })
    }
});

bot.on('text', (ctx) => {
    if (ctx.session.state == states.WAITING_FOR_REPO) {
        ctx.session.state = states.WAITING_FOR_REPO_TYPE;
        ctx.session.uuid = uuid();
        ctx.session.repo = ctx.message.text;

        ctx.reply(msg.WAITING_FOR_REPO_TYPE + ctx.message.text, Markup.keyboard(['Public', 'Private'], {columns: 2}).oneTime().resize().extra());
    } else if (ctx.session.state == states.WAITING_FOR_REPO_TYPE) {
        if (['Public', 'Private'].includes(ctx.message.text)) {
            if (ctx.message.text == 'Private') {
                ctx.session.state = states.WAITING_FOR_SECRET_PHRASE;
                ctx.reply(msg.WAITING_FOR_SECRET_PHRASE);
            } else {
                ctx.session.state = states.WAITING_FOR_CHAT_TYPE;
                ctx.reply(msg.WAITING_FOR_CHAT_TYPE + ctx.session.repo, Markup.keyboard(['Private chat', 'Group'], {columns: 2}).oneTime().resize().extra());
            }
        } else {
            ctx.reply(msg.WAITING_FOR_REPO_TYPE);
        }
    } else if (ctx.session.state == states.WAITING_FOR_SECRET_PHRASE) {
        ctx.session.state = states.WAITING_FOR_CHAT_TYPE;
        ctx.session.secretPhrase = ctx.message.text;

        ctx.reply(msg.WAITING_FOR_CHAT_TYPE + ctx.session.repo, Markup.keyboard(['Private chat', 'Group'], {columns: 2}).oneTime().resize().extra());
    } else if (ctx.session.state == states.WAITING_FOR_CHAT_TYPE) {
        if (['Group', 'Private chat'].includes(ctx.message.text)) {
            let id = ctx.message.text == 'Group' ? ctx.session.uuid : ctx.chat.id;
            ctx.session.state = states.DEFAULT;
            db.create(ctx.session.repo, id, ctx.session.secretPhrase).then(res => {
                if (ctx.message.text == 'Group') {
                    let payload = Buffer.from(ctx.session.repo + ':' + ctx.session.uuid).toString('base64');
                    ctx.reply(`https://t.me/${ctx.me}?startgroup=${payload}`);
                } else {
                    ctx.reply(msg.SUCCESS);
                }
            }).catch(err => {
                ctx.reply(msg.UNEXPECTED_ERROR);
            });
        } else {
            ctx.reply(msg.WAITING_FOR_CHAT_TYPE);
        }
    }
});

express.post('/notify', (req, res) => {
    let secret = req.query.secret;
    let payload = JSON.parse(req.body.payload);
    db.get(payload.repository.name).then(record => {
        if (record != null) {
            if (!secret || (secret && record.secretPhrase == secret)) {
                bot.telegram.sendMessage(record.chatId, 'Test');
            }
        }
    }).catch(err => {});
});

express.listen(PORT, () => {
    console.log('Webhooks listening on port', PORT);
});