//TODO: Show stage dimensions in chosen units above the done button
//TODO: Remove music bar unless we have time
//TODO: If have time, @ tags in formation comments
//TODO: Make instructions box collapsible
let dom = {}; //Holds DOM elements that don’t change, to avoid repeatedly querying the DOM
let stageView; //load stageView code
let timeline; //load stageView code, initialized when content loaded
let groupsView = new GroupsView();
let undoStack = []; //TODO: Limit these so they don't get too crazy
let redoStack = [];

//Attaching events on document
Util.events(document, {
    //runs at the end of start-up when the DOM is ready
    "DOMContentLoaded": () => {
        dom.root = Util.one("html");
        dom.undo = Util.one("#undo");
        dom.redo = Util.one("#redo");
        dom.sansFont = Util.getStyleValue(dom.root, "--sans-font");
        dom.stageDrawing = Util.one("#stageDrawing");
        dom.stageDrawingControls = Util.one("#stageDrawingControls");
        dom.gridScaleDiv = Util.one("#gridScale");
        dom.gridScaleValue = Util.one("#gridScaleValue");
        dom.gridScaleUnits = Util.one("#gridScaleUnits");
        dom.showGrid = Util.one("#showGridCheck");
        dom.snapToGridDiv = Util.one("#snapToGrid");
        dom.snapToGrid = Util.one("#snapToGridCheck");
        dom.showDancerSize = Util.one("#showDancerSizeCheck");
        dom.confirmStage = Util.one("#confirmStage");
        dom.drawingInstruction = Util.one("#drawingInstruction");
        dom.stageViewControls = Util.one("#stageViewControls");
        dom.stageViewControls.style.display = "flex";
        dom.stageView = Util.one("#stageView");
        stageView = new StageView(dom.stageView.getContext('2d', { alpha: false }), groupsView);
        dom.timeline = Util.one("#timeline");
        timeline = new Timeline(parseFloat(Util.getStyleValue(dom.root, "--slide-t")),
            parseFloat(Util.getStyleValue(dom.root, "--slide-width")),
            parseFloat(Util.getStyleValue(dom.root, "--slide-height")),
            parseFloat(Util.getStyleValue(dom.root, "--slide-spacing")),
            parseFloat(Util.getStyleValue(dom.root, "--slide-smaller")));
        dom.addDancer = Util.one("#addDancer");
        dom.removeDancer = Util.one("#removeDancer");
        dom.editStage = Util.one("#editStage");
        dom.zoomIn = Util.one("#zoomIn");
        dom.zoomOut = Util.one("#zoomOut");
        dom.resetView = Util.one("#resetView");
        dom.addFormation = Util.one("#addFormation");
        dom.insertFormation = Util.one("#insertFormation");
        dom.deleteFormation = Util.one("#deleteFormation");
        dom.formationCommentsBox = Util.one("#formationCommentsBox");
        dom.formationTitle = Util.one("#formationTitle");
        dom.addGroup = Util.one("#addGroup");
        dom.groupsDiv = Util.one("#groupsDiv");
        dom.audience = Util.one("#audience");
        dom.dancerHelp = Util.one("#dancerHelp");
        dom.timelineHelp = Util.one("#timelineHelp");
        dom.groupsHelp = Util.one("#groupsHelp");

        dom.dancerHelp.addEventListener("click", () => showTutorial(1));
        dom.timelineHelp.addEventListener("click", () => showTutorial(2));
        dom.groupsHelp.addEventListener("click", () => showTutorial(3));
        dom.undo.addEventListener("click", () => undo());
        dom.redo.addEventListener("click", () => redo());
        dom.showGrid.addEventListener("change", () => stageView.showGridPress());
        dom.gridScaleValue.addEventListener("keyup", () => stageView.gridScaleChange());
        dom.gridScaleUnits.addEventListener("change", () => stageView.gridScaleChange());
        dom.snapToGrid.addEventListener("change", () => stageView.snapToGridPress());
        dom.showDancerSize.addEventListener("change", () => stageView.showDancerSizePress());
        dom.confirmStage.addEventListener("click", () => {
            saveState();
            stageView.doneDrawing()
        });
        dom.editStage.addEventListener("click", () => {
            saveState();
            stageView.startDrawing()
        });
        dom.addDancer.addEventListener("click", () => stageView.addDancer());
        dom.removeDancer.addEventListener("click", () => stageView.removeDancer());
        dom.addGroup.addEventListener("click", () => groupsView.addGroup());
        dom.zoomIn.addEventListener("click", () => stageView.zoomAnim(20, 1.3));
        dom.zoomOut.addEventListener("click", () => stageView.zoomAnim(20, -1.3));
        dom.resetView.addEventListener("click", () => stageView.resetView());
        dom.insertFormation.addEventListener("click", () => timeline.insertFormation());
        dom.addFormation.addEventListener("click", () => {
            timeline.addFormation();
            dom.timeline.focus();
        });
        dom.deleteFormation.addEventListener("click", () => {
            timeline.deleteFormation();
            dom.timeline.focus();
        });
        dom.formationTitle.addEventListener("keyup", () => {
            dom.formationTitle.classList.remove("invalid");
            let invalid = false;
            for (let i = 0; i < timeline.formations.length; i++) {
                if (i !== timeline.curr &&
                    timeline.formations[i].name.innerText === dom.formationTitle.value) {
                    dom.formationTitle.classList.add("invalid");
                    invalid = true;
                }
            }
            if (!invalid) timeline.formations[timeline.curr].name.innerText = dom.formationTitle.value;
            timeline.formations[timeline.curr].name.resizeMe();
            formationTitleWidth();
        });
        Util.events(dom.stageView, {
            "mousedown": evt => {
                stageView.mousedown(getCanvasCoords(dom.stageView, evt), evt.buttons, evt.ctrlKey || evt.shiftKey);
            },
            "click": evt => {
                stageView.click(getCanvasCoords(dom.stageView, evt), evt.ctrlKey || evt.shiftKey);
            },
            "dblclick": evt => {
                stageView.dblclick(getCanvasCoords(dom.stageView, evt));
            },
            "mousewheel": evt => {
                stageView.mousewheel(evt, getCanvasCoords(dom.stageView, evt));
                return evt.preventDefault() && false;
            },
            "keypress": evt => {
                stageView.keypress(evt);
            },
            "keydown": evt => {
                stageView.keydown(evt);
                checkUndoRedo(evt);
            },
            "mouseenter": evt => {
                dom.stageView.focus();
            }
        });
        Util.events(dom.timeline, {
            "keydown": evt => {
                timeline.keydown(evt);
                checkUndoRedo(evt);
            },
            "mouseenter": evt => {
                dom.timeline.focus();
            }
        });

        window.setInterval(() => {
            if (stageView.redrawThumb && timeline.formations.length !== 0) {
                stageView.draw(timeline.formations[timeline.curr].ctx);
                stageView.redrawThumb = false;
            }
        }, 1000);


        timeline.insertFormation(false);
        stageView.respondCanvas(true);
        window.onresize = () => stageView.respondCanvas();
    },
    "mousemove": evt => {
        if (timeline !== null && timeline.mouse.dragging) {
            timeline.mouse.x = evt.clientX;
            timeline.dragSlide(evt);
            return evt.preventDefault() && false;
        } else {
            stageView.mousemove(getCanvasCoords(dom.stageView, evt));
            if (stageView.isDragging()) return evt.preventDefault() && false;
        }
    },
    "mouseup": evt => {
        let wasDragging = timeline.mouse.dragging || stageView.isDragging();
        stageView.mouseup();
        timeline.mouse.dragging = false;
        timeline.mouse.numSwaps = 0;
        if (wasDragging) return evt.preventDefault() && false;
    },
    "mouseenter": evt => {
        let wasDragging = (timeline !== null && timeline.mouse.dragging) || stageView.isDragging();
        stageView.mouseenter(evt.buttons);
        if (wasDragging) return evt.preventDefault() && false;
    },
    "mousedown": evt => {
        stageView.mousedownOutside();
    }
});
function checkUndoRedo(evt) {
    if (evt.ctrlKey === true && (evt.key === "Z" || evt.key === "y")) {
        redo(1);
        evt.preventDefault(); //Prevent default behavior for CTRL+Z and etc.
    }
    else if (evt.ctrlKey === true && evt.key === "z") {
        undo(1);
        evt.preventDefault();
    }
}

function getCanvasCoords(canvas, evt) {
    let topLeft = Util.offset(canvas);
    return { x: evt.clientX - topLeft.left, y: evt.clientY - topLeft.top };
}
function formationTitleWidth() {
    let width = stageView.measureText(dom.sansFont,
        Util.getStyleValue(dom.formationTitle, "font-size"), "normal", dom.formationTitle.value);
    dom.formationTitle.style.setProperty("width", `${width + 40}px`);
}

//After the first undo/redo in a series, the state being pushed to the other stack
// is the state that was just activated by the first undo/redo
let limbo = null;
function undo() {
    if (undoStack.length === 0) return;
    let state = undoStack.pop();
    let curr = { stageView: stageView, timeline: timeline };
    while (undoStack.length > 0 && checkStateEquals(state, curr)) state = undoStack.pop();
    if (limbo == null) {
        saveState(true);
        limbo = state;
    } else {
        redoStack.push(limbo);
        limbo = null;
    }
    stageView.selected = [];
    loadState(state);
    stageView.draw();
    undoRedoEnabledCheck();
}
function redo() {
    if (redoStack.length === 0) return;
    let state = redoStack.pop();
    if (limbo == null) {
        saveState(false, true);
        limbo = state;
    } else {
        undoStack.push(limbo);
        limbo = null;
    }
    stageView.selected = [];
    loadState(state);
    stageView.draw();
    undoRedoEnabledCheck();
}

/** Save the state of an object before modifiying it so it can be undone */
function saveState(saveToRedo = false, isASwap = false) {
    let state = {};

    state.stageView = Object.assign(Object.create(Object.getPrototypeOf(stageView)), stageView);
    state.stageView.points = Object.assign([], stageView.points);
    state.stageView.dancers = JSON.parse(JSON.stringify(stageView.dancers)); //Deep copy needed
    state.stageView.bounds = Object.assign({}, stageView.bounds);

    state.timeline = Object.assign(Object.create(Object.getPrototypeOf(timeline)), timeline);
    state.timeline.formations = []; //Deep copy needed, but objects have functions
    timeline.formations.forEach(formation => {
        state.timeline.formations.push({
            name: formation.name,
            slide: formation.slide,
            ctx: formation.ctx,
            comment: formation.comment
        });
    });

    if (saveToRedo) redoStack.push(state);
    else if (!(undoStack.length > 0 && checkStateEquals(undoStack[undoStack.length - 1], state))) {
        undoStack.push(state);
        if (!isASwap) {
            redoStack = [];
            limbo = null
        }
    }

    undoRedoEnabledCheck();
    // console.log("Stacks:", undoStack, redoStack);
}
function loadState(state) {
    // console.log("LOADING", state);
    // console.log("Replacing", stageView, timeline);
    let wasDrawing = stageView.drawingMode;

    stageView.drawingMode = state.stageView.drawingMode;
    stageView.firstPoint = state.stageView.firstPoint;
    stageView.closed = state.stageView.closed;
    stageView.currPoint = state.stageView.currPoint;
    stageView.stage = state.stageView.stage;
    stageView.points = state.stageView.points;
    stageView.dancers = state.stageView.dancers;
    stageView.bounds = state.stageView.bounds;

    timeline.changeFormations(state.timeline.formations);
    timeline.totalEver = state.timeline.totalEver;
    if (state.timeline.curr < timeline.formations.length) {
        timeline.formations.forEach(formation => formation.slide.classList.remove("selected"));
        timeline.selectFormation(state.timeline.curr);
    }


    checkUndoRedoChanges(wasDrawing, stageView.drawingMode);
    timeline.resetThumbnails();
}
function checkStateEquals(state1, state2) {
    return state1.stageView.drawingMode === state2.stageView.drawingMode &&
        JSON.stringify(state1.stageView.firstPoint) === JSON.stringify(state2.stageView.firstPoint) &&
        state1.stageView.closed === state2.stageView.closed &&
        state1.stageView.currPoint === state2.stageView.currPoint &&
        JSON.stringify(state1.stageView.stage) === JSON.stringify(state2.stageView.stage) &&
        JSON.stringify(state1.stageView.points) === JSON.stringify(state2.stageView.points) &&
        JSON.stringify(state1.stageView.dancers) === JSON.stringify(state2.stageView.dancers) &&
        JSON.stringify(state1.stageView.bounds) === JSON.stringify(state2.stageView.bounds) &&

        state1.timeline.curr === state2.timeline.curr &&
        state1.timeline.totalEver === state2.timeline.totalEver &&
        JSON.stringify(state1.timeline.formations) === JSON.stringify(state2.timeline.formations);
}

function undoRedoEnabledCheck() {
    dom.undo.disabled = undoStack.length === 0;
    dom.redo.disabled = redoStack.length === 0;
}

function checkUndoRedoChanges(wasDrawing, isDrawing) {
    if (wasDrawing !== isDrawing) {
        if (isDrawing) stageView.startDrawing();
        else stageView.doneDrawing();
    }
    dom.confirmStage.disabled = !stageView.closed;
}