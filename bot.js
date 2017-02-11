'use strict';

// States
const states = {
    DEFAULT: undefined,
    WAITING_FOR_REPO: 0,
    WAITING_FOR_CHAT_TYPE: 1,
    WAITING_FOR_REPO_TYPE: 2,
    WAITING_FOR_SECRET_PHRASE: 3,
    WAITING_FOR_START: 4,
    WAITING_FOR_DELETING_REPO: 5
};

// Messages
const msg = {
    START: `I'm a Travis CI bot. I can notify you about builds of your repositories.`,
    WAITING_FOR_REPO: `Please, send a repository name you'd like to receive build notifications from.`,
    WAITING_FOR_REPO_TYPE: `Please, choose access level for `,
    WAITING_FOR_CHAT_TYPE: `Please, choose where you would like to receive build notifications from `,
    WAITING_FOR_SECRET_PHRASE: `Please, type secret phrase.`,
    SUCCESS: 'Success',
    UNEXPECTED_ERROR: 'Unexpected error occurred, try again.',
    LIST: 'Here is the list of repos in this chat:',
    LIST_EMPTY: 'You have no repos in this chat!',
    WAITING_FOR_DELETING_REPO: 'Please choose the repo you\'d like to remove',
    SUCCESS_DELETE: 'Successfully removed repo from this chat!'

};

const Telegraf = require('telegraf'),
      { Extra, Markup } = require('telegraf'),
      db = require('./db'),
      uuid = require('shortid'),
      express = require("express")(),
      bodyParser = require('body-parser');

const TOKEN = process.env.BOT_TOKEN || '';
const URL = process.env.URL || 'https://your-app-url.com';
const PORT = process.env.PORT || 8443;
let USERNAME = 'bot';


const bot = new Telegraf(TOKEN);
bot.use(Telegraf.memorySession());

express.use(bot.webhookCallback(`/telegram-webhook${TOKEN}`));
express.use(bodyParser.urlencoded({ extended: false }));
express.use(bodyParser.json());

bot.telegram.getMe().then(me => {
    USERNAME = me.username;
    bot.telegram.setWebhook(`${URL}/telegram-webhook${TOKEN}`);
});

bot.command('start', (ctx) => {
    ctx.reply(msg.START);
});

bot.command('link', (ctx) => {
    ctx.session.state = states.WAITING_FOR_REPO;
    ctx.reply(msg.WAITING_FOR_REPO);
});

bot.command('cancel', (ctx) => {
    ctx.session.state = states.DEFAULT;
    ctx.reply(msg.START, Markup.removeKeyboard().extra());
});

bot.command('list', (ctx) => {
    db.allByChatId(ctx.chat.id).then(records => {
        let repos = records.map(record => record.repo);
        if (!repos.length) {
            ctx.reply(msg.LIST_EMPTY);
        } else {
            ctx.reply(msg.LIST + "\n" + repos.join("\n"));
        }
    }).catch(err => {});
});

bot.command('delete', (ctx) => {
    db.allByChatId(ctx.chat.id).then(records => {
        let repos = records.map(record => record.repo);
        if (!repos.length) {
            ctx.reply(msg.LIST_EMPTY);
        } else {
            ctx.session.state = states.WAITING_FOR_DELETING_REPO;
            ctx.reply(msg.WAITING_FOR_DELETING_REPO, Markup.keyboard(records.map(record => record.repo), {columns: 2}).oneTime().resize().extra());
        }
    }).catch(err => {});
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
            ctx.reply(msg.UNEXPECTED_ERROR);
            ctx.leaveChat();
        })
    }
});

bot.on('text', (ctx) => {
    if (ctx.session.state == states.WAITING_FOR_REPO) {
        ctx.session.state = states.WAITING_FOR_REPO_TYPE;
        ctx.session.uuid = uuid.generate();
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
                    ctx.reply(`https://t.me/${USERNAME}?startgroup=${payload}`, Markup.removeKeyboard().extra());
                } else {
                    ctx.reply(msg.SUCCESS, Markup.removeKeyboard().extra());
                }
            }).catch(err => {
                ctx.reply(msg.UNEXPECTED_ERROR);
            });
        } else {
            ctx.reply(msg.WAITING_FOR_CHAT_TYPE);
        }
    } else if (ctx.session.state == states.WAITING_FOR_DELETING_REPO) {
        db.delete(ctx.message.text, ctx.chat.id).then(_ => {
            ctx.reply(msg.SUCCESS_DELETE, Markup.removeKeyboard().extra());
        }).catch(err => {
            ctx.reply(msg.UNEXPECTED_ERROR);
        });
        ctx.session.state = states.DEFAULT;
    }
});

express.post('/notify', (req, res) => {
    let secret = req.query.secret;
    let payload = JSON.parse(req.body.payload);
    db.all(payload.repository.owner_name + '/' + payload.repository.name).then(records => {
        records.forEach(record => {
            if (!secret || (secret && record.secretPhrase == secret)) {
                bot.telegram.sendMessage(record.chatId, payload.status_message);
            }
        });
    }).catch(err => {});
    res.send();
});

express.listen(PORT, () => {
    console.log('Webhooks listening on port', PORT);
});