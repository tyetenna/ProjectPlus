
# Project Plus (Weatherscan Local)

A simulator based on The Weather Channel's "Weatherscan Local" channel. Running from 1999 to 2004, Weatherscan Local was a 24/7 weather information network, providing constant hyper-local data for the viewer's area. This channel ran using a custom WeatherSTAR XL unit installed at various cable headends throughout the country. This service was inevitably replaced by the newer and more popular version of Weatherscan, hosted on the IntelliSTAR 1.


Splash                     |  "Now" Slide              | "36 Hour Forecast"
:-------------------------:|:-------------------------:|:-------------------------:
![Splash](https://i.imgur.com/8z8e4d5.png)  |  !["Now" Slide](https://i.imgur.com/5IYxxOs.png) | !["36 Hour Forecast" Slide](https://i.imgur.com/aaG9iWz.png)







## Disclaimer

This is a very early version of the simulator, and is prone to bugs and errors. If you spot any, or have any ideas, please feel free to submit them on the Issues tab up above!
## Demo

You can access a live demo at https://dewpoint.team/, and you can specify a location by adding a "?" followed by a location name or zip code to the end (i.e https://dewpoint.team/?Madison)


## Authors

Team Dew Point
    - [@tyetenna](https://www.github.com/tyetenna)/[TyeWx](https://youtube.com/@TyeWx) & BMan

## Acknowledgements

 - [Goldblaze's Weatherscan Emulator](https://github.com/buffbears/Weatherscan) for inspring this project
 - Massive thanks to pjfrix's [TWC Resource Sheet](https://docs.google.com/spreadsheets/d/1FZCfi74ZGlmEVco4uHBq-Fe22avggDXJaSDa0CC7USo) for sources to the original images



## Run Locally

1. Download and install [Node.JS](https://nodejs.org/en)

2. Acquire weather.com/IBM and mapbox.com API keys. (WE WILL NOT ASSIST WITH ACQUIRING THESE)

3. Open config.js and enter your weather.com/IBM API key

4. Open newradar.js and enter your mapbox.com key

3. Install dependencies

```bash
  npm install package.json
```

4. Start the server

```bash
  node ./server.js
```

5. The server should now be running on localhost, port 3000!
# Screenshots

"Up Next" Slide                     |  "Weather Bulletin" Slide              | "Condiciones Actuales" (Current Condition) Slide
:-------------------------:|:-------------------------:|:-------------------------:
!["Up Next"](https://i.imgur.com/UiyTobV.png)  |  ![Weather Bulletin](https://i.imgur.com/wPyfeLx.png) | !["36 Hour Forecast" Slide](https://i.imgur.com/e7De1bj.png)
