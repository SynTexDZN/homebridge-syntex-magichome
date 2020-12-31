# Homebridge SynTex MagicHome
A simple plugin to control MagicHome devices.<br>
This plugin is made to cooperate with Homebridge: https://github.com/nfarina/homebridge<br>
It also offers some tweaks and improvements to the original devices.

[![NPM Recommended Version](https://img.shields.io/npm/v/homebridge-syntex-magichome?label=release&color=brightgreen)](https://www.npmjs.com/package/homebridge-syntex-magichome)
[![NPM Beta Version](https://img.shields.io/npm/v/homebridge-syntex-magichome/beta?color=orange&label=beta)](https://www.npmjs.com/package/homebridge-syntex-magichome)
[![GitHub Commits](https://badgen.net/github/commits/SynTexDZN/homebridge-syntex-magichome?color=yellow)](https://github.com/SynTexDZN/homebridge-syntex-magichome/commits)
[![NPM Downloads](https://badgen.net/npm/dt/homebridge-syntex-magichome?color=purple)](https://www.npmjs.com/package/homebridge-syntex-magichome)
[![GitHub Code Size](https://img.shields.io/github/languages/code-size/SynTexDZN/homebridge-syntex-magichome?color=0af)](https://github.com/SynTexDZN/homebridge-syntex-magichome)
[![Discord](https://img.shields.io/discord/442095224953634828?color=728ED5&label=discord)](https://discord.gg/XUqghtw4DE)

<br>

## Description
This plugin will create LightBulbs in HomeKit capable of turning on / off, change color, change saturation, change brightness.
This plugin can also create preset patterns Switches (color cycle, fade, strobe).
Its a great utility tool to set house mood to party / soothing with custom music.
Can cycle through colors, sync all lights to strobe / fade.


## Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-magichome`
3. Update your `config.json` file. See snippet below.
4. Restart the Homebridge Service with: `sudo systemctl restart homebridge; sudo journalctl -fau homebridge`


## Example Config
**Info:** If the `logDirectory` for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo chown -R homebridge ./SynTex/` *( permissions only for homebridge )*
- `sudo chmod 777 -R homebridge ./SynTex/` *( permissions for many processes )*

```
"platforms": [
    {
        "platform": "SynTexMagicHome",
        "logDirectory": "./SynTex/log",
        "port": 1712,
        "language": "us",
        "debug": false,
        "pollingInterval": 10,
        "accessories": [
            {
                "id": "light1",
                "name": "Kitchen LED Strip",
                "type": "light",
                "ip": "DC4F22C5D4E1",
                "services": "rgb",
                "purewhite": false
            },
            {
                "id": "light2",
                "name": "Living Room LED Strip",
                "type": "light",
                "ip": "192.168.1.112",
                "services": "rgbw",
                "purewhite": true
            },
            {
                "id": "pswitch1",
                "name": "Kitchen Color Strobe Flash (Party)",
                "type": "preset-switch",
                "ips": {
                    "192.168.1.111": "255,255,255"
                },
                "services": "switch",
                "preset": "seven_color_strobe_flash",
                "speed": 60
            },
            {
                "id": "pswitch2",
                "name": "All Lights Cross Fade (Soothing)",
                "type": "preset-switch",
                "ips": {
                    "DC4F22C5D4E1": "0,150,255",
                    "192.168.1.112": "102,255,102"
                },
                "services": "switch",
                "preset": "seven_color_cross_fade",
                "speed": 40,
                "shouldTurnOff": true
            },
            {
                "id": "rswitch1",
                "name": "Reset All Switches to Default",
                "type": "scene-switch",
                "services": "switch",
                "ips": {
                    "192.168.1.111": "255,255,255"
                }
            }
        ]
    }
]
```
### Required Parameters
- `platform` is always `SynTexMagicHome`
- `logDirectory` The path where your logs are stored.
- `accessories` For the accessory config.

### Optional Parameters
- `port` To control your accessory over HTTP calls.
- `language` You can use your country initials if you want to change it *( Currently supported: `us`, `en`, `de` )*
- `debug` For further information because of troubleshooting and bug reports.
- `pollingInterval` defines how often the plugin should chech the Magic Home Device state *( in seconds )*

### Accessory Config
- Every device needs these parameters: `id`, `name`, `type`, `ip` and `services` *( required )*
- `id` has to be a `random unique text` *( no duplicates! )*
- `name` could be anything.
- `type` can be: `light` / `preset-switch` / `scene-switch`
- `ip` Use a normal ip or a mac address.
- `services` Should be a `switch` *( for preset and reset switches )* or `rgb` / `rgbw` *( based on your device: look below )*


---


## Update MagicHome Devices
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device ID`
3. For the `New Value` you can type this pattern:
- For all devices: `true` / `false` *( preset switch, reset swithc, colored light )*
- For colored lights add `&hue=`  **New Hue**  or `&saturation=`  **New Saturation**  or `&brightness=`  **New Brightness** *( have to be numbers )*

**Example:**  `http://homebridge.local:1712/devices?id=ABCDEF1234567890&value=true&hue=4&saturation=100&brightness=100`\
*( Updates the value and hue, saturation and brightness of `ABCDEF1234567890` to `turned on, orange color, 100% saturation, 100% brightness` as example )*


## Read MagicHome Device Values
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**
2. Insert the `Bridge IP` and `Device ID`

**Example:**  `http://homebridge.local:1712/devices?id=ABCDEF1234567890`\
*( Reads the value of `ABCDEF1234567890` as example )*


## Remove MagicHome Device
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&remove=CONFIRM`
2. Insert the `Bridge IP` and `Device ID`

**Example:**  `http://homebridge.local:1712/devices?id=ABCDEF1234567890&remove=CONFIRM`\
*( Removes `ABCDEF1234567890` from the home app )*


---


## Compatible Devices
Any devices created by Zengge and running on the Magic Home Wi-Fi (or other apps by the same developer such as LED Magic Color) app should work with this plugin. Some examples of compatible devices are:

- [5 Channel Controller for RGB LED Strip](http://amzn.to/2eAljEV) `rgbw`
- [Magic UFO RGBW LED Strip controller](http://amzn.to/2eyoRdE)
- [SuperLegends Wi-Fi smart bulb](http://amzn.to/2eCxq6a) `rgb`
- [Victorstar Wi-Fi Smart Light Bulb](http://amzn.to/2eCCM13)
- [Flux Wi-Fi Light Bulb](http://amzn.to/2eCx3IC)
- [Fen-Yi Light Bulb](http://amzn.to/2ehjP3s)
- [Waterproof RGB LED Strips WIFI Controller](http://amzn.to/2eoDQZx) `rgb`
- [Eastlion RGB Wi-Fi Strip Controller](http://amzn.to/2eCF8wV)


## Preset Switch Configuration

`ips` must be a key-value object where `key` is MagicHome LED IP Address e.g. `192.168.1.11` or `DC4F22C5XXXX` MAC Address & `value` is default rgb color of the light. e.g. `"255,255,255" (White)`
Turning off Preset Pattern Switch , all lights will be reset to this color.

You can use MAC Address instead of IP Address as well. Please note format of MAC Address. It should be in capital letters and `:` should not be present. e.g. `DC4F22C5XXXX`

Do note : While using MACS : This plugin auto discover connected lights on the network and map IP's to their corresponding MAC. Initially it can take time to discover all devices. All devices should be discovered and mapped in 60-120s. Once mapped IP & MACs are cached, and gets rediscovered every 30s to map new IP to the light. This feature is useful for people unable to assign Static IP to their lights.

Setting `pollingInterval` to 0, will disable polling device for status update.


## Available Presets Scenes
```
seven_color_cross_fade
red_gradual_change
green_gradual_change
blue_gradual_change
yellow_gradual_change
cyan_gradual_change
purple_gradual_change
white_gradual_change
red_green_cross_fade
red_blue_cross_fade
green_blue_cross_fade
seven_color_strobe_flash
red_strobe_flash
green_strobe_flash
blue_stobe_flash
yellow_strobe_flash
cyan_strobe_flash
purple_strobe_flash
white_strobe_flash
seven_color_jumping
```


## Available Custom Presets Scenes
```
gradual_color_fade
dark_gradual_color_fade
strobe_lights
police_lights
```