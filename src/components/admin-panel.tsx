import React from "react";
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Input, 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";
import type { BlindLevel } from "./tournament-context";
import { useConfirmation } from "./confirmation-dialog"; // Add this import

export const AdminPanel: React.FC = () => {
  const { 
    state, 
    updateLevel, 
    addLevel, 
    removeLevel,
    updateInitialChips,
    updateRebuyChips,
    updateAddonChips,
    updateBackgroundImage,
    updateClubLogo,
    updateEntryFee,
    updateRebuyFee,
    updateAddonFee,
    syncData,
    createNewTournament,
    loadTournament,
    getAllTournaments,
    deleteTournament
  } = useTournament();
  
  const [newLevel, setNewLevel] = React.useState<Omit<BlindLevel, "id">>({
    type: 'level',
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    duration: 15
  });
  
  const [newItemType, setNewItemType] = React.useState<'level' | 'pause'>('level');
  
  const [tournaments, setTournaments] = React.useState<Array<{id: string; name: string; createdAt: number}>>([]);
  const [newTournamentName, setNewTournamentName] = React.useState("Новый турнир");
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const { confirm, dialog } = useConfirmation();
  
  // Load tournaments on component mount
  React.useEffect(() => {
    const loadTournaments = async () => {
      const allTournaments = await getAllTournaments();
      setTournaments(allTournaments);
    };
    
    loadTournaments();
  }, [getAllTournaments]);
  
  const handleAddLevel = () => {
    if (newItemType === 'level') {
      if (newLevel.smallBlind > 0 && newLevel.bigBlind > 0) {
        addLevel(newLevel);
        setNewLevel({
          type: 'level',
          smallBlind: 0,
          bigBlind: 0,
          ante: 0,
          duration: 15
        });
      }
    } else {
      // Add pause
      addLevel({
        type: 'pause',
        smallBlind: 0,
        bigBlind: 0,
        ante: 0,
        duration: newLevel.duration,
        name: newLevel.name || 'Перерыв'
      });
      setNewLevel({
        type: 'pause',
        smallBlind: 0,
        bigBlind: 0,
        ante: 0,
        duration: 15,
        name: 'Перерыв'
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'background' | 'logo') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер: 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === 'background') {
        updateBackgroundImage(result);
      } else {
        updateClubLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'background' | 'logo') => {
    if (type === 'background') {
      updateBackgroundImage(null);
    } else {
      updateClubLogo(null);
    }
  };

  const handleCreateNewTournament = async () => {
    confirm({
      title: "Создать новый турнир",
      message: "Вы уверены, что хотите создать новый турнир? Все несохраненные данные текущего турнира будут потеряны.",
      confirmLabel: "Создать",
      cancelLabel: "Отмена",
      confirmColor: "primary",
      icon: "lucide:plus-circle",
      onConfirm: async () => {
        const tournamentId = await createNewTournament(newTournamentName);
        if (tournamentId) {
          // Refresh tournaments list
          const allTournaments = await getAllTournaments();
          setTournaments(allTournaments);
        }
      }
    });
  };
  
  const handleLoadTournament = async (id: string) => {
    confirm({
      title: "Загрузить турнир",
      message: "Вы уверены, что хотите загрузить выбранный турнир? Все несохраненные данные текущего турнира будут потеряны.",
      confirmLabel: "Загрузить",
      cancelLabel: "Отмена",
      confirmColor: "primary",
      icon: "lucide:folder-open",
      onConfirm: async () => {
        await loadTournament(id);
      }
    });
  };
  
  const handleDeleteTournament = async (id: string, name: string) => {
    confirm({
      title: "Удалить турнир",
      message: `Вы уверены, что хотите удалить турнир "${name}"? Это действие нельзя отменить.`,
      confirmLabel: "Удалить",
      cancelLabel: "Отмена",
      confirmColor: "danger",
      icon: "lucide:trash-2",
      onConfirm: async () => {
        await deleteTournament(id);
        // Refresh tournaments list
        const allTournaments = await getAllTournaments();
        setTournaments(allTournaments);
      }
    });
  };

  return (
    <div className="p-4 space-y-6">
      {dialog}
      
      {/* Tournament Management */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Управление турнирами</h2>
          <div className="flex gap-2">
            <Button 
              color="primary" 
              onPress={onOpen}
              startContent={<Icon icon="lucide:plus-circle" />}
            >
              Новый турнир
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Сохраненные турниры</h3>
              <Button 
                variant="flat" 
                color="primary" 
                size="sm"
                startContent={<Icon icon="lucide:refresh-cw" />}
                onPress={async () => {
                  const allTournaments = await getAllTournaments();
                  setTournaments(allTournaments);
                }}
              >
                Обновить список
              </Button>
            </div>
            
            {tournaments?.length || 0 > 0 ? (
              <Table removeWrapper aria-label="Список турниров">
                <TableHeader>
                  <TableColumn>Название</TableColumn>
                  <TableColumn>Дата создания</TableColumn>
                  <TableColumn>Действия</TableColumn>
                </TableHeader>
                <TableBody>
                  {(tournaments || []).map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell>{tournament.name}</TableCell>
                      <TableCell>
                        {new Date(tournament.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            color="primary" 
                            variant="flat"
                            onPress={() => handleLoadTournament(tournament.id)}
                          >
                            <Icon icon="lucide:folder-open" className="mr-1" />
                            Загрузить
                          </Button>
                          <Button 
                            size="sm" 
                            color="danger" 
                            variant="light"
                            onPress={() => handleDeleteTournament(tournament.id, tournament.name)}
                          >
                            <Icon icon="lucide:trash-2" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-6 bg-content2 rounded-medium">
                <Icon icon="lucide:database" className="text-4xl text-default-400 mb-2" />
                <p className="text-default-600">Нет сохраненных турниров</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* New Tournament Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Создать новый турнир</ModalHeader>
              <ModalBody>
                <Input
                  label="Название турнира"
                  value={newTournamentName}
                  onValueChange={setNewTournamentName}
                  placeholder="Введите название турнира"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Отмена
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => {
                    handleCreateNewTournament();
                    onClose();
                  }}
                >
                  Создать
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      {/* Sync Button */}
      <div className="flex justify-end">
        <Button 
          color="primary" 
          variant="flat" 
          onPress={syncData}
          startContent={<Icon icon="lucide:refresh-cw" />}
        >
          Синхронизировать данные
        </Button>
      </div>

      {/* Tournament Appearance */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Оформление турнира</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Background Image Upload */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Фоновое изображение</h3>
              <div className="flex flex-col gap-3">
                {state.backgroundImage ? (
                  <div className="relative">
                    <img 
                      src={state.backgroundImage} 
                      alt="Фон турнира" 
                      className="w-full h-40 object-cover rounded-medium"
                    />
                    <Button
                      isIconOnly
                      color="danger"
                      variant="solid"
                      size="sm"
                      className="absolute top-2 right-2"
                      onPress={() => handleRemoveImage('background')}
                    >
                      <Icon icon="lucide:x" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 bg-content2 rounded-medium border-2 border-dashed border-default-300">
                    <div className="text-center text-default-500">
                      <Icon icon="lucide:image" className="text-3xl mb-2" />
                      <p>Нет загруженного фона</p>
                    </div>
                  </div>
                )}
                <label>
                  <Button 
                    as="span" 
                    color="primary" 
                    variant="flat" 
                    className="w-full"
                    startContent={<Icon icon="lucide:upload" />}
                  >
                    Загрузить фоновое изображение
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'background')}
                  />
                </label>
                <p className="text-xs text-default-500">
                  Рекомендуемый размер: 1920x1080px. Максимальный размер файла: 2MB
                </p>
              </div>
            </div>

            {/* Club Logo Upload */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Логотип клуба</h3>
              <div className="flex flex-col gap-3">
                {state.clubLogo ? (
                  <div className="relative">
                    <div className="flex items-center justify-center h-40 bg-content2 rounded-medium">
                      <img 
                        src={state.clubLogo} 
                        alt="Логотип клуба" 
                        className="max-w-full max-h-36 object-contain"
                      />
                    </div>
                    <Button
                      isIconOnly
                      color="danger"
                      variant="solid"
                      size="sm"
                      className="absolute top-2 right-2"
                      onPress={() => handleRemoveImage('logo')}
                    >
                      <Icon icon="lucide:x" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 bg-content2 rounded-medium border-2 border-dashed border-default-300">
                    <div className="text-center text-default-500">
                      <Icon icon="lucide:image-plus" className="text-3xl mb-2" />
                      <p>Нет загруженного логотипа</p>
                    </div>
                  </div>
                )}
                <label>
                  <Button 
                    as="span" 
                    color="primary" 
                    variant="flat" 
                    className="w-full"
                    startContent={<Icon icon="lucide:upload" />}
                  >
                    Загрузить логотип клуба
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                  />
                </label>
                <p className="text-xs text-default-500">
                  Рекомендуемый размер: 400x200px. Максимальный размер файла: 2MB
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Chip and Fee Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Настройки фишек и стоимости</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                type="number"
                label="Начальный стек"
                value={state.initialChips.toString()}
                onValueChange={(value) => updateInitialChips(Number(value) || 0)}
                min={0}
                startContent={
                  <Icon icon="lucide:coins" className="text-default-400 text-lg" />
                }
              />
            </div>
            <div>
              <Input
                type="number"
                label="Фишки за ребай"
                value={state.rebuyChips.toString()}
                onValueChange={(value) => updateRebuyChips(Number(value) || 0)}
                min={0}
                startContent={
                  <Icon icon="lucide:refresh-cw" className="text-default-400 text-lg" />
                }
              />
            </div>
            <div>
              <Input
                type="number"
                label="Фишки за аддон"
                value={state.addonChips.toString()}
                onValueChange={(value) => updateAddonChips(Number(value) || 0)}
                min={0}
                startContent={
                  <Icon icon="lucide:plus-circle" className="text-default-400 text-lg" />
                }
              />
            </div>
          </div>
          
          <Divider className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                type="number"
                label="Стоимость входа"
                value={state.entryFee.toString()}
                onValueChange={(value) => updateEntryFee(Number(value) || 0)}
                min={0}
                startContent={
                  <Icon icon="lucide:ticket" className="text-default-400 text-lg" />
                }
              />
            </div>
            <div>
              <Input
                type="number"
                label="Стоимость ребая"
                value={state.rebuyFee.toString()}
                onValueChange={(value) => updateRebuyFee(Number(value) || 0)}
                min={0}
                startContent={
                  <Icon icon="lucide:repeat" className="text-default-400 text-lg" />
                }
              />
            </div>
            <div>
              <Input
                type="number"
                label="Стоимость аддона"
                value={state.addonFee.toString()}
                onValueChange={(value) => updateAddonFee(Number(value) || 0)}
                min={0}
                startContent={
                  <Icon icon="lucide:plus" className="text-default-400 text-lg" />
                }
              />
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Tournament Structure */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Структура турнира</h2>
        </CardHeader>
        <CardBody>
          <Table removeWrapper aria-label="Структура блайндов">
            <TableHeader>
              <TableColumn>Уровень</TableColumn>
              <TableColumn>Тип</TableColumn>
              <TableColumn>Малый блайнд</TableColumn>
              <TableColumn>Большой блайнд</TableColumn>
              <TableColumn>Анте</TableColumn>
              <TableColumn>Длительность (мин)</TableColumn>
              <TableColumn>Действия</TableColumn>
            </TableHeader>
            <TableBody>
              {(state.levels || []).map((level) => (
                <TableRow key={level.id} className={level.type === 'pause' ? "bg-content2/50" : ""}>
                  <TableCell>
                    {level.type === 'pause' 
                      ? <span className="flex items-center gap-1">
                          <Icon icon="lucide:coffee" className="text-default-600" />
                          {level.name || 'Перерыв'}
                        </span> 
                      : level.id}
                  </TableCell>
                  <TableCell>
                    {level.type === 'pause' ? 'Перерыв' : 'Уровень'}
                  </TableCell>
                  <TableCell>
                    {level.type === 'pause' ? (
                      '-'
                    ) : (
                      <Input
                        type="number"
                        size="sm"
                        value={level.smallBlind.toString()}
                        onValueChange={(value) => 
                          updateLevel(level.id, { smallBlind: Number(value) || 0 })
                        }
                        min={0}
                        isDisabled={level.type !== 'level'}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {level.type === 'pause' ? (
                      '-'
                    ) : (
                      <Input
                        type="number"
                        size="sm"
                        value={level.bigBlind.toString()}
                        onValueChange={(value) => 
                          updateLevel(level.id, { bigBlind: Number(value) || 0 })
                        }
                        min={0}
                        isDisabled={level.type !== 'level'}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {level.type === 'pause' ? (
                      '-'
                    ) : (
                      <Input
                        type="number"
                        size="sm"
                        value={level.ante.toString()}
                        onValueChange={(value) => 
                          updateLevel(level.id, { ante: Number(value) || 0 })
                        }
                        min={0}
                        isDisabled={level.type !== 'level'}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      size="sm"
                      value={level.duration.toString()}
                      onValueChange={(value) => 
                        updateLevel(level.id, { duration: Number(value) || 1 })
                      }
                      min={1}
                    />
                  </TableCell>
                  <TableCell>
                    {level.type === 'pause' && (
                      <Input
                        size="sm"
                        value={level.name || 'Перерыв'}
                        onValueChange={(value) => 
                          updateLevel(level.id, { name: value })
                        }
                        placeholder="Название перерыва"
                        className="mb-2"
                      />
                    )}
                    <Button 
                      size="sm" 
                      isIconOnly 
                      color="danger" 
                      variant="light"
                      onPress={() => removeLevel(level.id)}
                      isDisabled={state.levels?.length || 0 <= 1}
                    >
                      <Icon icon="lucide:trash-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Divider className="my-4" />
          
          {/* Add New Level or Pause */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Добавить новый {newItemType === 'level' ? 'уровень' : 'перерыв'}
              </h3>
              <div className="flex gap-2">
                <Button 
                  variant={newItemType === 'level' ? 'solid' : 'flat'} 
                  color={newItemType === 'level' ? 'primary' : 'default'}
                  onPress={() => setNewItemType('level')}
                  startContent={<Icon icon="lucide:layers" />}
                  size="sm"
                >
                  Уровень
                </Button>
                <Button 
                  variant={newItemType === 'pause' ? 'solid' : 'flat'} 
                  color={newItemType === 'pause' ? 'primary' : 'default'}
                  onPress={() => setNewItemType('pause')}
                  startContent={<Icon icon="lucide:coffee" />}
                  size="sm"
                >
                  Перерыв
                </Button>
              </div>
            </div>
            
            {newItemType === 'level' ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  type="number"
                  label="Малый блайнд"
                  value={newLevel.smallBlind.toString()}
                  onValueChange={(value) => 
                    setNewLevel({...newLevel, smallBlind: Number(value) || 0})
                  }
                  min={0}
                />
                <Input
                  type="number"
                  label="Большой блайнд"
                  value={newLevel.bigBlind.toString()}
                  onValueChange={(value) => 
                    setNewLevel({...newLevel, bigBlind: Number(value) || 0})
                  }
                  min={0}
                />
                <Input
                  type="number"
                  label="Анте"
                  value={newLevel.ante.toString()}
                  onValueChange={(value) => 
                    setNewLevel({...newLevel, ante: Number(value) || 0})
                  }
                  min={0}
                />
                <Input
                  type="number"
                  label="Длительность (мин)"
                  value={newLevel.duration.toString()}
                  onValueChange={(value) => 
                    setNewLevel({...newLevel, duration: Number(value) || 1})
                  }
                  min={1}
                />
                <div className="flex items-end">
                  <Button color="primary" onPress={handleAddLevel}>
                    <Icon icon="lucide:plus" className="mr-1" />
                    Добавить уровень
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Название перерыва"
                  value={newLevel.name || 'Перерыв'}
                  onValueChange={(value) => 
                    setNewLevel({...newLevel, name: value})
                  }
                  placeholder="Например: Обеденный перерыв"
                  startContent={<Icon icon="lucide:tag" className="text-default-400" />}
                />
                <Input
                  type="number"
                  label="Длительность (мин)"
                  value={newLevel.duration.toString()}
                  onValueChange={(value) => 
                    setNewLevel({...newLevel, duration: Number(value) || 1})
                  }
                  min={1}
                  startContent={<Icon icon="lucide:clock" className="text-default-400" />}
                />
                <div className="flex items-end">
                  <Button color="primary" onPress={handleAddLevel}>
                    <Icon icon="lucide:plus" className="mr-1" />
                    Добавить перерыв
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};