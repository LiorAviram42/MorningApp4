import { KidConfig, KidId, Task } from './types';

import profileYuvali from '/profile_yuvali.png';
import profileMaayani from '/profile_maayani.png';
import profilePalgi from '/profile_palgi.png';

import teethOff from '/icon_teeth_off.png';
import teethOn from '/icon_teeth_on.png';
import hairOff from '/icon_hair_off.png';
import hairOn from '/icon_hair_on.png';
import toiletOff from '/icon_toilet_off.png';
import toiletOn from '/icon_toilet_on.png';
import clothesOff from '/icon_clothes_off.png';
import clothesOn from '/icon_clothes_on.png';
import shoesOff from '/icon_shoes_off.png';
import shoesOn from '/icon_shoes_on.png';
import cerealOff from '/icon_cereal_off.png';
import cerealOn from '/icon_cereal_on.png';
import bagOff from '/icon_bag_off.png';
import bagOn from '/icon_bag_on.png';

import faceYuvaliOff from '/icon_face_yuvali_off.png';
import faceYuvaliOn from '/icon_face_yuvali_on.png';
import faceMaayaniOff from '/icon_face_maayani_off.png';
import faceMaayaniOn from '/icon_face_maayani_on.png';
import facePelegiOff from '/icon_face_pelegi_off.png';
import facePelegiOn from '/icon_face_pelegi_on.png';

import diaperOff from '/icon_diaper_off.png';
import diaperOn from '/icon_diaper_on.png';

export const KIDS: Record<KidId, KidConfig> = {
  yuvali: {
    id: 'yuvali',
    name: 'יובלי',
    profileImg: profileYuvali,
    gradient: 'linear-gradient(to right, #ffb3ba, #ffdfba)',
    outlineColor: '#ffb3ba',
  },
  maayani: {
    id: 'maayani',
    name: 'מעייני',
    profileImg: profileMaayani,
    gradient: 'linear-gradient(to right, #bae1ff, #d0f4de)',
    outlineColor: '#bae1ff',
  },
  palgi: {
    id: 'palgi',
    name: 'פלגי',
    profileImg: profilePalgi,
    gradient: 'linear-gradient(to right, #d0f4de, #f2f2c2)',
    outlineColor: '#d0f4de',
  },
};

export const getTasksForKid = (kidId: KidId): Task[] => {
  const baseTasks: Task[] = [
    { id: 'teeth', title: 'צחצוח\nשיניים', iconOff: teethOff, iconOn: teethOn, side: 'right' },
    { id: 'hair', title: 'סירוק', iconOff: hairOff, iconOn: hairOn, side: 'right' },
    { id: 'toilet', title: 'שירותים', iconOff: toiletOff, iconOn: toiletOn, side: 'right' },
    { id: 'face', title: 'שטיפת פנים', iconOff: faceYuvaliOff, iconOn: faceYuvaliOn, side: 'right' },
    { id: 'clothes', title: 'בגדים', iconOff: clothesOff, iconOn: clothesOn, side: 'left' },
    { id: 'shoes', title: 'נעליים', iconOff: shoesOff, iconOn: shoesOn, side: 'left' },
    { id: 'cereal', title: 'ארוחת בוקר', iconOff: cerealOff, iconOn: cerealOn, side: 'left' },
    { id: 'bag', title: 'תיק', iconOff: bagOff, iconOn: bagOn, side: 'left' }
  ];

  let tasks = [...baseTasks];

  const faceTask = tasks.find(t => t.id === 'face');
  if (faceTask) {
    if (kidId === 'yuvali') {
      faceTask.iconOff = faceYuvaliOff;
      faceTask.iconOn = faceYuvaliOn;
    } else if (kidId === 'maayani') {
      faceTask.iconOff = faceMaayaniOff;
      faceTask.iconOn = faceMaayaniOn;
    } else if (kidId === 'palgi') {
      faceTask.iconOff = facePelegiOff;
      faceTask.iconOn = facePelegiOn;
    }
  }

  if (kidId === 'maayani') {
    tasks = tasks.filter(t => t.id !== 'hair');
    const clothesTask = tasks.find(t => t.id === 'clothes');
    if (clothesTask) clothesTask.side = 'right';
  } else if (kidId === 'palgi') {
    tasks = tasks.filter(t => t.id !== 'bag');
    const toiletTask = tasks.find(t => t.id === 'toilet');
    if (toiletTask) {
      toiletTask.title = 'טיטול';
      toiletTask.iconOff = diaperOff;
      toiletTask.iconOn = diaperOn;
    }
  }

  return tasks;
};
