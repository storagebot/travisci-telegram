'use strict';

const Telegraf = require('telegraf'),
      db = require('./db'),
      state = require('./state'),
      express = require("express")(),
      bodyParser = require('body-parser');

const TOKEN = process.env.BOT_TOKEN || '';
const URL = process.env.URL || 'https://your-app-url.com';
const PORT = process.env.PORT || 8443;

const bot = new Telegraf(TOKEN);
bot.use(Telegraf.memorySession());

// Middlewares for telegram webhooks and for parsing request body
express.use(bot.webhookCallback(`/telegram-webhook${TOKEN}`));
express.use(bodyParser.urlencoded({ extended: false }));
express.use(bodyParser.json());

let handler;
bot.telegram.getMe().then(me => {
    bot.options.username = me.username;

    // Init handlers
    handler = require('./handler')(bot);

    // Start telegram webhook
    bot.startPolling()//bot.telegram.setWebhook(`${URL}/telegram-webhook${TOKEN}`);
});

bot.command('start', (ctx) => {
    ctx = handler.handleStart(ctx);
});

bot.command('link', (ctx) => {
    ctx = handler.handleStartLinking(ctx);
});

bot.command('cancel', (ctx) => {
    ctx = handler.handleCancel(ctx);
});

bot.command('list', (ctx) => {
    ctx = handler.handleList(ctx);
});

bot.command('delete', (ctx) => {
    ctx = handler.handleDelete(ctx);
});

bot.hears(/\/start@([^ ]+) (.*)/, (ctx) => {
    ctx = handler.handleStartGroup(ctx);
});

bot.on('text', (ctx) => {
    switch (ctx.session.state) {
        case state.WAITING_FOR_REPO:
            ctx = handler.handleRepoEnter(ctx);
            break;
        case state.WAITING_FOR_REPO_TYPE:
            ctx = handler.handleRepoType(ctx);
            break;
        case state.WAITING_FOR_SECRET_PHRASE:
            ctx = handler.handleSecretPhrase(ctx);
            break;
        case state.WAITING_FOR_CHAT_TYPE:
            ctx = handler.handleChatType(ctx);
            break;
        case state.WAITING_FOR_DELETING_REPO:
            ctx = handler.handleRepoDelete(ctx);
            break;
    }
});

express.post('/notify', (req, res) => {
    try {
        let secret = req.query.secret;
        let payload = JSON.parse(req.body.payload);
        db.all(payload.repository.owner_name + '/' + payload.repository.name).then(records => {
            records.forEach(record => {
                if (!secret || (secret && record.secretPhrase == secret)) {
                    bot.telegram.sendMessage(record.chatId, payload.status_message);
                }
            });
        }).catch(err => {});
    } catch (err) {

    } finally {
        res.send();
    }
});

express.listen(PORT, () => {
    console.log('Webhooks listening on port', PORT);
});