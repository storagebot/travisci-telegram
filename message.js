// Add format() function to String
String.prototype.format = function() {
    return this.replace(/\{(\d+)}/g, (match, p) => arguments[p] != undefined ? arguments[p] : match);
};

module.exports = {
    START: "I'm a Travis CI bot. I can notify you about builds of your repositories.\n\nAvailable commands:\n" +
    "/link - Add new repository to receive notifications from Travis CI\n" +
    "/list - List all current repositories\n" +
    "/delete - Delete repository\n" +
    "/help - Print this message\n" +
    "/cancel - Cancel current command\n",
    WAITING_FOR_REPO: `Please, send a repository name in format *user/repo* you'd like to receive build notifications from`,
    WAITING_FOR_REPO_TYPE: `Please, choose access level for {0}.\nIf you repo is private you will have to enter secret phrase`,
    WAITING_FOR_CHAT_TYPE: "You should add following lines to your *.travis.yml*:\n" +
    "`notifications:\n  webhooks: {0}/notify{1}`\n\n" +
    "Please, choose where you would like to receive build notifications from {2}",
    WAITING_FOR_CHAT_TYPE_AGAIN: "Please, choose where you would like to receive build notifications from {0}",
    WAITING_FOR_SECRET_PHRASE: "Please, type secret phrase. It will be used in your repo Travis CI config file",
    SUCCESS: 'Now you will receive notifications about builds for {0} in this chat.',
    UNEXPECTED_ERROR: 'Unexpected error occurred, try again.',
    LIST: 'Here is the list of repos in this chat:\n{0}',
    LIST_EMPTY: 'You have no repos in this chat!',
    WAITING_FOR_DELETING_REPO: 'Please choose the repo you\'d like to remove',
    SUCCESS_DELETE: 'Successfully removed repo from this chat!',
    STARTGROUP_MESSAGE: 'Please open this link:\nhttps://t.me/{0}?startgroup={1}\nand choose a group you want link with this repo.',
    NOTIFICATION_MAIN: '{0} Build {1} ({2}) of {3}@{4} by {5} {6} in a {7}',
    REPO_VALIDATE_NAME: 'Repository name should be in format *user/repo*. Please, send valid name again',
    REPO_VALIDATE_EXIST: 'You are already receiving notifications from this repo. Please, send valid name again',
    LINK_FROM_GROUP: 'Link command can be used only from private chat with bot.'
};