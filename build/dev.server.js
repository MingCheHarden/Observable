const express = require('express');
const app = express();
var port = 5555;

app.use(express.static('src'));

app.listen(port, function(err) {
    if (err) {
        return console.log(err);
    }
    console.log('server Listening at localhost11:' + port);
});