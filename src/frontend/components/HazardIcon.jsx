import React from 'react';
import TornadoIcon from '@mui/icons-material/Tornado';
import FloodIcon from '@mui/icons-material/Flood';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import AirIcon from '@mui/icons-material/Air';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CycloneIcon from '@mui/icons-material/Cyclone';
import WavesIcon from '@mui/icons-material/Waves';
import CloudIcon from '@mui/icons-material/Cloud';
import MasksIcon from '@mui/icons-material/Masks';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// First match wins, so more specific words come first.
const ICONS = [
  [/tornado/i, TornadoIcon],
  [/hurricane|tropical|typhoon|storm surge/i, CycloneIcon],
  [/flood|hydrologic/i, FloodIcon],
  [/thunderstorm/i, ThunderstormIcon],
  [/red flag|fire/i, LocalFireDepartmentIcon],
  [/heat/i, WbSunnyIcon],
  [/winter|blizzard|snow|ice|freez|frost|cold|chill/i, AcUnitIcon],
  [/air quality|smoke|dust/i, MasksIcon],
  [/rip current|surf|marine|small craft|seas|beach|tsunami|gale|storm warning/i, WavesIcon],
  [/wind/i, AirIcon],
  [/fog/i, CloudIcon],
];

export default function HazardIcon({ event, size = 20 }) {
  const Icon = ICONS.find(([re]) => re.test(event))?.[1] || WarningAmberIcon;
  return <Icon sx={{ fontSize: size }} aria-hidden="true" />;
}
