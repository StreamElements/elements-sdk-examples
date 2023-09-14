// Register a custom composite field
window.widget.compositeFields.registerCompositeFieldProvider({
  // first comes the meta data 
  getCompositeFieldMetadata: () => ({
    displayName: 'Hello World',
    description: 'An example composite field',
    defaultMimeType: 'text/multiline',
    defaultBaseType: 'text',
    type: 'helloWorld',
  }),
  // now define the create flow (what happens when a user adds a custom field to the canvas)
  async createCompositeFieldInstance({ compositeFieldId, configState }) {
    const htmlElement = document.createElement('div'); //  Create the base HTML element

    function renderStaticState() {
      const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field

      window.widget.compositeFields.applyHtmlElementTextContent({
        htmlElement,
        textContent: `${field.text?.[0]?.content} (Hello World)`,
        style: field.style,
        highlightStyle: field.highlightedStyle,
      });
    }

    function renderPlayingState() {
      const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field

      window.widget.compositeFields.applyHtmlElementTextContent({
        htmlElement,
        textContent: `${field.text?.[0]?.content} (Hello World Playing)`,
        style: field.style,
        highlightStyle: field.highlightedStyle,
      });
    }

    function handle_startSequencePlaybackRequested() {
      // this will block the queue while alert is being played, until done or canceled
      return window.widget.queue.awaitTask(()=>new Promise(resolve => {
        let animationTimeoutHandle = null;

        renderPlayingState();

        function doneSequencePlayback() {
          if (animationTimeoutHandle) {
            clearTimeout(animationTimeoutHandle);
            animationTimeoutHandle = null;
          }

          window.widget.events.off('cancelSequencePlaybackRequested', doneSequencePlayback); // making sure we resolve this without an extra cancel request
          
          // Back to initial rendering state
          renderStaticState();
          
          resolve();
        }

        // Define what happens when the editor, widget container (or your code) sends a stop playback request --> MUST BE IMPLEMENTED
        window.widget.events.on('cancelSequencePlaybackRequested', doneSequencePlayback);

        // Our "animation" minimum is 1000 milliseconds but if there is an animation definition in the configState, it will take it
        //let timerCounter=1;
        //if (configState.settings.compositeFields[compositeFieldId].animation){
        //  timerCounter= configState.settings.compositeFields[compositeFieldId].animation.static.animationDuration.replace("s",""); 
        //}
        //setTimeout(doneSequencePlayback, 1000*timerCounter);
        setTimeout(doneSequencePlayback, 1000);
      }));
    }

    // Define what happens when the editor, widget container (or your code) sends an emulation request --> MUST BE IMPLEMENTED
    window.widget.events.on('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);

    // Render initial state
    renderStaticState();

    return {
      get compositeFieldSchema() {
        const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field

        return {
          type: 'helloWorld',
          baseType: 'text',
          value: field.text?.[0]?.content || 'Enter your text', // existing or default value for editor
          mimeType: 'text/multiline',
        };
      },
      get htmlElement() {
        return htmlElement;
      },
      async dispose() {
        // Unsubscribe from event handlers
        window.widget.events.off('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);
      },
    };
  },
});
