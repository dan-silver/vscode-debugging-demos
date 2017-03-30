// open folder in separate VS Code window

// set breakpoint either with 'debugger' or in gutter 
let i:number = 0;
setInterval(() => {
    i++;

    console.log(`hello world! ${i}`)
}, 300);


// delete .js.map file
// make change, .map file needs to stay in sync