// open folder in separate VS Code window

// set breakpoint either with 'debugger' or in gutter 
let i:number = 0;
setInterval(() => {
    // debugger
    i++;

    console.log(`hello world! ${i}`)
}, 300);