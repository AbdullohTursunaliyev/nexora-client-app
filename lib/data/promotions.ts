import { Images } from '../../constants/Images';

export interface Promotion {
  id: string;
  title: string;
  discountText: string;
  schedule: string;
  image: string;
  accentColor: string;
}

export const PROMOTIONS: Promotion[] = [
  {
    id: '1',
    title: 'HAYOTDAN ROHAT',
    discountText: '25% chegirma',
    schedule: 'Bugun · 16:00 - 23:59',
    image: Images.promotion,
    accentColor: '#00CFFF',
  },
  {
    id: '2',
    title: 'HAFTA OXIRI MEGA',
    discountText: '40% chegirma',
    schedule: 'Shanba-Yakshanba',
    image: Images.clubs[1],
    accentColor: '#A78BFA',
  },
  {
    id: '3',
    title: 'TUNGI GAMER',
    discountText: '30% chegirma',
    schedule: '00:00 - 06:00',
    image: Images.clubs[2],
    accentColor: '#FF34E0',
  },
  {
    id: '4',
    title: "TURNIR HAFTASI",
    discountText: 'Bepul kirish',
    schedule: '24-30 May',
    image: Images.tournaments.dota2,
    accentColor: '#F59E0B',
  },
  {
    id: '5',
    title: 'PS5 ZONA',
    discountText: '15% chegirma',
    schedule: 'Har kuni · 10:00 - 14:00',
    image: Images.zones.ps5,
    accentColor: '#22C55E',
  },
];
