import React from 'react';
import { User as UserType } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import { ProfilMandiri } from '../shared/ProfilMandiri';

interface MuridProfilProps {
  db: LMSDatabase;
  currentUser: UserType;
  onUpdateUser: (user: UserType) => void;
}

export const MuridProfil: React.FC<MuridProfilProps> = ({ db, currentUser, onUpdateUser }) => {
  return (
    <ProfilMandiri
      currentUser={currentUser}
      db={db}
      onUpdateUser={onUpdateUser}
      isModal={false}
    />
  );
};
