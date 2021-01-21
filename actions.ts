import axios from 'axios';
import { deviceStateListner } from './devices';

// LED Tree
deviceStateListner.on('0af5d793-8006-4cad-a19d-384a95b3c09a', value => {
    axios.post(process.env.CONTROL_URL, {
        usb: value
    });
});

// Computer
deviceStateListner.on('cf3c2ecd-2c62-4a74-8078-fb0a01540354', value => {
    axios.post(process.env.CONTROL_URL, {
        computer: value
    });
});
