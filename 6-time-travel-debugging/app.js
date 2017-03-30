// intro - node version switcher (nvs)

// first use "launch" config

// node --record app.js

let i=0;

setInterval(() => {
    i++;
    console.log("hello, world", i)
    
    let date = new Date();
    foobar(date, i)

}, 100)


function foobar(date, i) {
    throw new Error("error...")
}