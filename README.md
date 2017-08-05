# Travis CI Telegram bot
Pretty simple Telegram bot which will send you a notification when your Travis CI build is done.  
## Usage
Just add [@travisci_build_bot](https://t.me/travisci_build_bot) and send the link to your Travis CI repo in format user/repository. Bot uses web hooks so you will have to set up notifications in `.travis.yml` file.
## Private repositories
It supports private repositories. Just send secret phrase to the bot and use this phrase as a query parameter in the notification link:
```
notifications:
    webhooks: https://fathomless-fjord-24024.herokuapp.com/notify?secret=<SECRET_PHRASE>
```
