import { KidConfig, KidId, Task } from './types';

const profileYuvali = './profile_yuvali.png';
const profileMaayani = './profile_maayani.png';
const profilePalgi = './profile_palgi.png';

const teethOff = './icon_teeth_off.png';
const teethOn = './icon_teeth_on.png';
const hairOff = './icon_hair_off.png';
const hairOn = './icon_hair_on.png';
const toiletOff = './icon_toilet_off.png';
const toiletOn = './icon_toilet_on.png';
const clothesOff = './icon_clothes_off.png';
const clothesOn = './icon_clothes_on.png';
const shoesOff = './icon_shoes_off.png';
const shoesOn = './icon_shoes_on.png';
const cerealOff = './icon_cereal_off.png';
const cerealOn = './icon_cereal_on.png';
const bagOff = './icon_bag_off.png';
const bagOn = './icon_bag_on.png';

const faceYuvaliOff = './icon_face_yuvali_off.png';
const faceYuvaliOn = './icon_face_yuvali_on.png';
const faceMaayaniOff = './icon_face_maayani_off.png';
const faceMaayaniOn = './icon_face_maayani_on.png';
const facePelegiOff = './icon_face_pelegi_off.png';
const facePelegiOn = './icon_face_pelegi_on.png';

const diaperOff = './icon_diaper_off.png';
const diaperOn = './icon_diaper_on.png';

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
