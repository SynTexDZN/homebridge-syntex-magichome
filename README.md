# Homebridge SynTex MagicHome
[![NPM Recommended Version](https://img.shields.io/npm/v/homebridge-syntex-magichome?label=release&color=brightgree&style=for-the-badge)](https://www.npmjs.com/package/homebridge-syntex-magichome)
[![NPM Beta Version](https://img.shields.io/npm/v/homebridge-syntex-magichome/beta?color=orange&label=beta&style=for-the-badge)](https://www.npmjs.com/package/homebridge-syntex-magichome)
[![NPM Downloads](https://img.shields.io/npm/dt/homebridge-syntex-magichome?color=9944ee&&style=for-the-badge)](https://www.npmjs.com/package/homebridge-syntex-magichome)
[![GitHub Commits](https://img.shields.io/github/commits-since/SynTexDZN/homebridge-syntex-magichome/0.0.0?color=yellow&label=commits&style=for-the-badge)](https://github.com/SynTexDZN/homebridge-syntex-magichome/commits)
[![GitHub Code Size](https://img.shields.io/github/languages/code-size/SynTexDZN/homebridge-syntex-magichome?color=0af&style=for-the-badge)](https://github.com/SynTexDZN/homebridge-syntex-magichome)

A simple plugin to control MagicHome devices.<br>
This plugin is made to cooperate with Homebridge: https://github.com/nfarina/homebridge<br>
It also offers some tweaks and improvements to the original devices.


## Core Features
- **Device Control:** View and control your lights color, saturarion, brightness.
- **Scene Support:** Use colorful scenes from MagicHome or some custom ones.
- **Color Switches:** Set the color of your own light groups by value.
- **HTTP Access:** Update and read device states via HTTP calls.
- **Automation:** We integrated our powerful automation API for fast and complex automation.


## Troubleshooting
#### [![GitHub Issues](https://img.shields.io/github/issues-raw/SynTexDZN/homebridge-syntex-magichome?logo=github&style=for-the-badge)](https://github.com/SynTexDZN/homebridge-syntex-magichome/issues)
- `Report` us your `Issues`
- `Join` our `Discord Server`
#### [![Discord](https://img.shields.io/discord/442095224953634828?color=5865F2&logoColor=white&label=discord&logo=discord&style=for-the-badge)](https://discord.gg/XUqghtw4DE)


---


## Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-magichome`
3. Update your `config.json` file. See snippet below.
4. Restart the Homebridge Service with: `sudo systemctl restart homebridge; sudo journalctl -fau homebridge`


## Example Config
**Info:** If the `baseDirectory` for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo mkdir -p /var/homebridge/SynTex/` *( create the directory )*
- `sudo chown -R homebridge /var/homebridge/SynTex/` *( permissions only for homebridge )*
- `sudo chmod 777 -R homebridge /var/homebridge/SynTex/` *( permissions for many processes )*

```json
"platforms": [
    {
        "platform": "SynTexMagicHome",
        "baseDirectory": "/var/homebridge/SynTex",
        "options": {
            "port": 1712,
            "language": "us",
            "pollingInterval": 10
        },
        "log": {
            "debug": false
        },
        "accessories": [
            {
                "id": "light1",
                "name": "Kitchen LED Strip",
                "services": [
                    {
                        "type": "rgb",
                        "function": "light",
                        "ip": "DC4F22C5D4E1"
                    }
                ]
            },
            {
                "id": "light2",
                "name": "Living Room LED Strip",
                "services": [
                    {
                        "type": "rgbw",
                        "function": "light",
                        "ip": "192.168.1.100"
                    }
                ]
            },
            {
                "id": "pswitch1",
                "name": "Kitchen Color Strobe Flash (Party)",
                "services": [
                    {
                        "type": "switch",
                        "function": "preset-switch",
                        "ips": {
                            "192.168.1.100": "255,255,255"
                        },
                        "preset": "seven_color_strobe_flash",
                        "speed": 60
                    }
                ]
            },
            {
                "id": "pswitch2",
                "name": "All Lights Cross Fade (Soothing)",
                "services": [
                    {
                        "type": "switch",
                        "function": "preset-switch",
                        "ips": {
                            "DC4F22C5D4E1": "0,150,255",
                            "192.168.1.100": "102,255,102"
                        },
                        "preset": "seven_color_cross_fade",
                        "speed": 40,
                        "shouldTurnOff": true
                    }
                ]
            },
            {
                "id": "rswitch1",
                "name": "Reset All Switches to Default",
                "services": [
                    {
                        "type": "switch",
                        "function": "scene-switch",
                        "ips": {
                            "192.168.1.100": "255,255,255"
                        }
                    }
                ]
            },
            {
                "id": "multi1",
                "name": "Multi Accessory",
                "services": [
                    {
                        "type": "rgbw",
                        "function": "light",
                        "name": "Single Color",
                        "ip": "192.168.1.100"
                    },
                    {
                        "type": "switch",
                        "function": "preset-switch",
                        "name": "Color Fade",
                        "ips": {
                            "192.168.1.100": "255,255,255"
                        },
                        "preset": "seven_color_strobe_flash",
                        "speed": 60
                    }
                ]
            }
        ]
    }
]
```

### Required Parameters
- `platform` is always `SynTexMagicHome`
- `baseDirectory` The path where cache data is stored.
- `accessories` For the accessory config.

### Optional Parameters
- `port` To control your accessory over HTTP calls.
- `language` You can use your country initials if you want to change it *( Currently supported: `us`, `en`, `de` )*
- `pollingInterval` defines how often the plugin should chech the Magic Home device state *( in seconds )*

### Log Parameters
- Disable certain log level: `error`, `warn`, `info`, `read`, `update`, `success` and `debug` *( for example `debug: false` )*

### Accessory Config
- Every device needs these parameters: `id`, `name` and `services` *( required )*
- `id` has to be a `random unique text` *( no duplicates! )*
- `name` could be anything.
- `services` choose a device config from below.

### Light Config
- `type` must be either `rgb` / `rgbw` *( based on your device: look below )*
- `function` is always `light`
- `ip` use a normal ip or a mac address.

### Preset Switch Config
- `type` must be a `switch` *( for preset and reset switches )*
- `function` is always `preset-switch`
- `ips` must be a key-value object where `key` is MagicHome LED IP Address e.g. `192.168.1.100` or `DC4F22C5XXXX` MAC Address & `value` is default rgb color of the light. e.g. `"255,255,255" (White)`
- `preset` is the name of the preset you want to use for the effect *( see `Available Presets Scenes` below )*
- `speed` defines the speed of the effect *( from 0 to 100 )*

### Scene Switch Config
- `type` must be a `switch` *( for preset and reset switches )*
- `function` is always `scene-switch`
- `ips` must be a key-value object where `key` is MagicHome LED IP Address e.g. `192.168.1.100` or `DC4F22C5XXXX` MAC Address & `value` is default rgb color of the light. e.g. `"255,255,255" (White)`

You can use MAC Address instead of IP Address as well. Please note format of MAC Address. It should be in capital letters and `:` should not be present. e.g. `DC4F22C5XXXX`


---


## SynTex UI
Control and set up your devices by installing `homebridge-syntex`<br>
This plugin is made for plugin management, automation system and device control.<br><br>

Check out the GitHub page for more information:<br>
https://github.com/SynTexDZN/homebridge-syntex


## Update MagicHome Devices
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device ID`
3. For the `New Value` you can type this pattern:
- For all devices: `true` / `false` *( colored light, preset switch, reset switch )*
- For colored lights add `&hue=`  **New Hue**  or `&saturation=`  **New Saturation**  or `&brightness=`  **New Brightness** *( have to be numbers )*
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service type add `&counter=`  **SERVICENUMBER**\
*( First of that type = 0, second = 1 .. )*

**Example:**  `http://homebridge.local:1712/devices?id=ABCDEF1234567890&value=true&hue=4&saturation=100&brightness=100`\
*( Updates the value and hue, saturation and brightness of `ABCDEF1234567890` to `turned on, orange color, 100% saturation, 100% brightness` for example )*


## Read MagicHome Device Values
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**
2. Insert the `Bridge IP` and `Device ID`
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service type add `&counter=`  **SERVICENUMBER**\
*( First of that type = 0, second = 1 .. )*

**Example:**  `http://homebridge.local:1712/devices?id=ABCDEF1234567890`\
*( Reads the value of `ABCDEF1234567890` for example )*


## Remove MagicHome Device
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&remove=CONFIRM`
2. Insert the `Bridge IP` and `Device ID`
- To remove a specific service add `&type=`  **SERVICETYPE**
- To remove a specific service from an accessory with more than one of the same service type add `&counter=`  **SERVICENUMBER**\
*( First of that type = 0, second = 1 .. )*

**Example:**  `http://homebridge.local:1712/devices?id=ABCDEF1234567890&remove=CONFIRM`\
*( Removes `ABCDEF1234567890` from the Config and Home App )*


---


## Automation
To enable the automation module you have to create a file named `automation.json` in your `baseDirectory >> automation` or install the `homebridge-syntex` plugin to create them via UI *( only between SynTex plugins )*<br><br>
**Example:**  For manual configuration update your `automation.json` file. See snippet below.   

```json
{
    "automation": [
        {
            "id": 0,
            "name": "Demo Automation",
            "active": true,
            "trigger": [
                {
                    "id": "multi2",
                    "name": "Multi Device",
                    "letters": "F0",
                    "plugin": "SynTexWebHooks",
                    "operation": "<",
                    "value": "1000"
                }
            ],
            "condition": [
                {
                    "id": "multi1",
                    "name": "Multi Switch",
                    "letters": "41",
                    "plugin": "SynTexWebHooks",
                    "operation": "=",
                    "value": "false"
                }
            ],
            "result": [
                {
                    "id": "light1",
                    "name": "Kitchen LED Strip",
                    "letters": "30",
                    "plugin": "SynTexMagicHome",
                    "operation": "=",
                    "value": "true",
                    "hue": "4",
                    "saturation": "100",
                    "brightness": "100"
                },
                {
                    "url": "http://192.168.1.100:1712/devices?id=58747407d8cfc108d0dc&value=true&brightness=100"
                }
            ]
        }
    ]
}
```

### Required Parameters
- `id` is the same like in your config file *( or in your log )*
- `name` The name of the accessory.
- `letters` See letter configuration below.
- `operation` Use the logical operands *( `>`, `<`, `=` )*
- `value` The state value of your accessory.

### Optional Parameters
- `plugin` Use the platform name of the plugin *( see supported plugins below )*
- `brightness` can be used for dimmable / RGB lights.
- `hue` can be used for RGB lights.
- `saturation` can be used for RGB lights.

### Letter Configuration
The letters are split into two parts *( characters )*

**1. Service Type**
- 0 : Occupancy
- 1 : Smoke
- 2 : Airquality
- 3 : RGB
- 4 : Switch
- 5 : Relais
- 6 : Stateless Switch
- 7 : Outlet
- 8 : LED
- 9 : Dimmer
- A : Contact
- B : Motion
- C : Temperature
- D : Humidity
- E : Rain
- F : Light
- G : Blind

**2. Duplicate Counter**
- If there are more services of the same type the counter indicates which is which
- Simply count from top to bottom.

**Example:**  The first switch in your config has the letters `40`, the second `41` and so on ..

### Supported Plugins
- SynTexKNX *( `homebridge-syntex-knx` )*
- SynTexMagicHome *( `homebridge-syntex-magichome` )*
- SynTexTuya *( `homebridge-syntex-tuya` )*
- SynTexWebHooks *( `homebridge-syntex-webhooks` )*


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

### Available Presets Scenes
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

### Available Custom Presets Scenes
```
gradual_color_fade
dark_gradual_color_fade
strobe_lights
police_lights
```