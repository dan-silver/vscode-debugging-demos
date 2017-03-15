// set breakpoint either with 'debugger' or in gutter 

setInterval(() => {
    // debugger

    console.log("hello world!")
}, 3000);
// check launch.json




// conditional breakpoints
/*
let count = 0;
setInterval(() => {
    count += 1
    // hacky way in code
    if (count % 2 == 0)
        debugger;

    console.log(`hello world! ${count}`)
}, 1000);
*/

// conditional breakpoints in gutter
// set (count % 2 == 0) in gutter

/*
let count = 0;
setInterval(() => {
    count += 1;

    console.log(`hello world! ${count}`)
}, 1000);
*/

// also see "hit count"
// can use both together - number of hits when the expression evaluated to true