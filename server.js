const path = require('path');
const express = require('express');
const chalk = require('chalk');

const app = express();

app.use(express.static(path.join(__dirname, 'static')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'static/index.html'));
});

app.listen(3333, 'localhost', (err) => {
    if (err) console.log(chalk.red(err));
    else {
        console.log(chalk.yellow('Master, I am ready to serve You at http://localhost:3333! Shall we begin?'));
    }
});
