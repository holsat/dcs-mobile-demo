# Welcome to the Digital Chant Stand Plus app

This application is basically a front-end viewer for the https://DCS.goarch.org/ website, as is the DCS mobile app.
It enhances the standard DCS application by adding search and annotation functions that are missing in the GOA DCS application when opening the services for viewing, like the Divine Liturgy. Note that, unlike the DCS application, this app does not provide functionality for services that allows you to download the PDF versions. Due to making it simple to use with the altar server annotations feature, I disabled the ability to load in downloadable and printable PDF content.
All content loaded by this app is loaded on demand from the DCS website. Intelligent caching is built in to reduce traffic/load on the upstream website. If all you want to do is view the content from the DCS website, you don't need an app, you can use your mobile web browser.

There is no claim of copyright ownership over any of the content loaded by this application. All content belongs to the copyright owners as detailed in the About page (reproduced from the DCS application).
It is my initial intention to make this project open source; however, if the GOARCH/AGES team wants to take ownership, I will likely transfer the repository to them. 

## Annotations Feature
This application allows you to open a service for a particular day, i.e like the Liturgy or Matins and place specific icons or notes into the content. These icons/notes are retained when loading the same service, even if you load a service from a different day. As long as you load the same service, the annotations should be preserved.
There are 2 types of annotations that can be placed by long pressing on the content.
1) Icons
2) Notes.

There are a number of icons that have been created to assist altar servers. Altar servers have the ability to place these icons to mark certain events in the Liturgy, like when candles need to be lit, when candle bearers need to go out, when Deacons go out the deacon doors and come back in, etc.
These icons can be placed and removed.

Text notes can also be placed and removed on any of the liturgical services' content that is accessed via the Services menu. Like the icons, they should persist over the same services loaded for different days. Notes can be added and removed.
All annotation features can be enabled or disabled via the settings menu.

These annotations are stored locally on the device in the application cache/store. So if you remove the application and all its data and then reinstall it, your annotations will be gone. Likewise if you get a new phone it will not have your annotations. I know this is not ideal, but hey, this is app version 0.1. 
There is also currently no ability to share these annotations with others. I have some thoughts around how to do this, but I don't want to create remote backends to sync/distribute this kind of data, so I need to think about an effective method for doing this.

## Development 
This application was developed with React Native and Expo. 
While I am a trained computer scientist, I am not a mobile developer, nor am I a web/JavaScript developer (I'm an old C/C++ guy). 
As a result, this application was entirely vibe-coded in Factory.ai over about 5 hours.

## Getting started

1. Get Started

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).