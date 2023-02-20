// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog, nativeTheme} = require('electron')
const path = require('path')
const pngquant = require('pngquant-bin');
const { execFile } = require('child_process');
const fs = require('fs');
const { shell } = require('electron');
const ProgressBar = require('electron-progressbar');

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  ipcMain.on('open-file-dialog', (event) => {
    const options = {
      title: 'Sélectionner le ou les fichiers à upload',
      properties: ['openFile', 'multiSelection']
    };

    dialog.showOpenDialog(mainWindow, options).then(result => {
      if (!result.canceled) {
        event.sender.send('selected-files', result.filePaths);
      }
    });
  });

  ipcMain.on('selected-files', (event, files) => {
    dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [ { name: 'Images', extensions: ['png'] }]
    }).then(result => {
      if (!result.canceled) {
        const tmpDir = app.getPath("desktop");
        const compressedFilesDir = path.join(tmpDir, 'compressed-files');

        if (!fs.existsSync(compressedFilesDir)) {
          fs.mkdirSync(compressedFilesDir);
        }

        const progressBar = new ProgressBar({
          indeterminate: true,
          title: 'Compression in progress...',
          text: 'Please wait...'
        });
        progressBar
          .on('completed', () => {
            console.log('Compression completed');
            progressBar.detail = 'Compression completed.';
          })
          .on('aborted', () => {
            console.log('Compression aborted');
            dialog.showMessageBox({
              type: 'warning',
              title: 'Oh no !',
              message: 'Compression aborted !'
            });
          });

        const filePaths = result.filePaths;

        filePaths.forEach(filePath => {
          const fileName = path.basename(filePath);
          const compressedFilePath = path.join(compressedFilesDir, fileName);

          execFile(pngquant, ['-o', compressedFilePath, filePath], (error, stdout, stderr) => {
            if (error) {
              console.error(`Error compressing the file: ${error}`);
              dialog.showMessageBox({
                type: 'warning',
                title: 'Oh no !',
                message: 'Error compressing the file!'
              })
              progressBar.setCompleted();
              return;
            }

            console.log(`File compressed successfully: ${filePath}`);
            shell.openPath(compressedFilesDir);
              dialog.showMessageBox({
                type: 'info',
                title: 'Congratulation !',
                message: 'Your files have been compressed !'
              });
              progressBar.setCompleted();
          });
        });
      }
    }).catch(err => {
      console.error(`Error opening file dialog: ${err}`);
      dialog.showMessageBox({
        type: 'warning',
        title: 'Oh no !',
        message: 'Error opening file dialog!'
      })
    });
});

  mainWindow.loadFile('index.html')

}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})


ipcMain.on('darkmode', (event) => {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  console.log("DARK MODE")
  if (isDarkMode) {
    mainWindow.webContents.executeJavaScript('document.body.classList.add("dark-mode")');
  }
})
