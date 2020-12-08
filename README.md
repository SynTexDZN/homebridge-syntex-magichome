# Homebridge SynTex MagicHome
A simple plugin to control MagicHome devices.<br>
This plugin is made to cooperate with Homebridge: https://github.com/nfarina/homebridge<br>
It also offers some tweaks and improvements to the original devices.


## Description
This plugin will create LightBulbs in Homekit capable of turning on/off, change color, change hue, change saturation.
This plugin can also create preset patterns Switches (color cycle, fade, strobe).
Its a great utility tool to set house mood to party/soothing with custom music.
Can cycle through colors, sync all lights to strobe/fade.


## Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-magichome`
3. Update your `config.json` file. See snippet below.
4. Restart the Homebridge Service with `sudo systemctl restart homebridge; sudo journalctl -fau homebridge`.


## Example Config
**Info:** If the directory for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo chown -R homebridge ./SynTex/` ( *permissions only for homebridge* )
- `sudo chmod 777 -R homebridge ./SynTex/` ( *permissions for many processes* )
- For the id you can use a `random unique text`
- Every device needs these configurations: `id`, `name`, `type`, `ip` and `services`

```
"platforms": [
    {
        "platform": "SynTexMagicHome",
        "log_directory": "./SynTex/log",
        "port": 1712,
        "debug": false,
        "accessories": [
            {
                "id": "light1",
                "name": "Kitchen LED Strip",
                "type": "light",
                "ip": "DC4F22C5D4E1",
                "services": "rgb",
                "purewhite": false,
                "timeout": 10000
            },
            {
                "id": "light2",
                "name": "Living Room LED Strip",
                "type": "light",
                "ip": "192.168.1.112",
                "services": "rgbw",
                "purewhite": true,
                "timeout": 0
            },
            {
                "id": "pswitch1",
                "name": "Kitchen Color Strobe Flash (Party)",
                "type": "preset-switch",
                "ips": {
                    "192.168.1.111": "255,255,255"
                },
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
                "preset": "seven_color_cross_fade",
                "speed": 40,
                "shouldTurnOff": true
            },
            {
                "id": "rswitch1",
                "name": "Reset All Switches to Default",
                "type": "reset-switch",
                "ips": {
                    "192.168.1.111": "255,255,255"
                }
            }
        ]
    }
]
```


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

`ips` must be a key-value object where `key` is MagicHome LED IP Address e.g. `192.168.1.11` or `DC4F22C5XXXX` MAC Address & `value` is default rgb color of the light. e.g. `"255,255,255" (White)`.
Turning off Preset Pattern Switch , all lights will be reset to this color.

You can use MAC Address instead of IP Address as well. Please note format of MAC Address. It should be in capital letters and `:` should not be present. e.g. `DC4F22C5XXXX`

Do note : While using MACS : This plugin auto discover connected lights on the network and map IP's to their corresponding MAC. Initially it can take time to discover all devices. All devices should be discovered and mapped in 60-120s. Once mapped IP & MACs are cached, and gets rediscovered every 30s to map new IP to the light. This feature is useful for people unable to assign Static IP to their lights.

Setting Device `timeout` to 0, will disable polling device for status update.


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