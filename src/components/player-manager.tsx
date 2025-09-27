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
  TableCell 
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";
import { useConfirmation } from "./confirmation-dialog";

export const PlayerManager: React.FC = () => {
  const { 
    state, 
    addPlayer, 
    removePlayer, 
    addRebuy, 
    addAddon,
    eliminatePlayer,
    revivePlayer,
    addBountyChips,
    recordPayment,
    syncData,
    updatePlayerName,
    saveStatus
  } = useTournament();
  
  const [newPlayerName, setNewPlayerName] = React.useState("");
  const [bountyAmount, setBountyAmount] = React.useState<Record<number, number>>({});
  const [paymentAmount, setPaymentAmount] = React.useState<Record<number, number>>({});
  const [editingPlayerId, setEditingPlayerId] = React.useState<number | null>(null);
  const [editPlayerName, setEditPlayerName] = React.useState("");
  
  // Add connection status indicator
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  
  // Check Firebase connection status
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // Вместо вызова syncData, который меняет состояние, просто проверяем соединение
        setIsConnected(true);
      } catch (error) {
        console.error("Firebase connection error:", error);
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []); // Удаляем syncData из зависимостей
  
  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName("");
    }
  };

  const handleRemovePlayer = (player) => {
    confirm({
      title: "Удаление игрока",
      message: `Вы уверены, что хотите удалить игрока "${player.name}" из турнира? Это действие нельзя отменить.`,
      confirmLabel: "Удалить",
      cancelLabel: "Отмена",
      confirmColor: "danger",
      icon: "lucide:trash-2",
      onConfirm: () => removePlayer(player.id)
    });
  };

  const handleAddRebuy = (player) => {
    confirm({
      title: "Подтверждение ребая",
      message: `Добавить ребай для игрока "${player.name}"? Будет добавлено ${state.rebuyChips.toLocaleString()} фишек.`,
      confirmLabel: "Добавить ребай",
      cancelLabel: "Отмена",
      confirmColor: "primary",
      icon: "lucide:refresh-cw",
      onConfirm: () => {
        console.log("Adding rebuy for player", player.id);
        addRebuy(player.id);
      }
    });
  };

  const handleAddAddon = (player) => {
    confirm({
      title: "Подтверждение аддона",
      message: `Добавить аддон для игрока "${player.name}"? Будет добавлено ${state.addonChips.toLocaleString()} фишек.`,
      confirmLabel: "Добавить аддон",
      cancelLabel: "Отмена",
      confirmColor: "secondary",
      icon: "lucide:plus-circle",
      onConfirm: () => {
        console.log("Adding addon for player", player.id);
        addAddon(player.id);
      }
    });
  };

  const handleEliminatePlayer = (player) => {
    confirm({
      title: "Подтверждение выбывания",
      message: `Отметить игрока "${player.name}" как выбывшего из турнира?`,
      confirmLabel: "Подтвердить выбывание",
      cancelLabel: "Отмена",
      confirmColor: "danger",
      icon: "lucide:x-circle",
      onConfirm: () => {
        console.log("Eliminating player", player.id);
        eliminatePlayer(player.id);
      }
    });
  };

  const handleRevivePlayer = (player: Player) => {
    confirm({
      title: "Возвращение игрока",
      message: `Вернуть игрока "${player.name}" в игру с ребаем? Будет добавлено ${state.rebuyChips.toLocaleString()} фишек.`,
      confirmLabel: "Вернуть с ребаем",
      cancelLabel: "Отмена",
      confirmColor: "success",
      icon: "lucide:undo",
      onConfirm: () => revivePlayer(player.id)
    });
  };

  const handleUpdateBounty = (player: Player, amount: number) => {
    addBountyChips(player.id, amount);
  };

  const handleRecordPayment = (player: Player) => {
    const amount = paymentAmount[player.id] || 0;
    if (amount <= 0) {
      return;
    }
    
    const totalCost = 
      state.entryFee + 
      (player.rebuys * state.rebuyFee) + 
      (player.addons * state.addonFee);
    
    const remainingToPay = totalCost - player.paidAmount;
    
    if (amount > remainingToPay) {
      confirm({
        title: "Превышение суммы",
        message: `Вы пытаетесь внести ${amount} руб., но осталось оплатить только ${remainingToPay} руб. Внести только оставшуюся сумму?`,
        confirmLabel: "Да, внести остаток",
        cancelLabel: "Отмена",
        confirmColor: "warning",
        icon: "lucide:alert-triangle",
        onConfirm: () => {
          recordPayment(player.id, remainingToPay);
          setPaymentAmount(prev => ({...prev, [player.id]: 0}));
        }
      });
    } else {
      confirm({
        title: "Подтверждение оплаты",
        message: `Внести оплату ${amount} руб. для игрока "${player.name}"?`,
        confirmLabel: "Подтвердить",
        cancelLabel: "Отмена",
        confirmColor: "success",
        icon: "lucide:credit-card",
        onConfirm: () => {
          recordPayment(player.id, amount);
          setPaymentAmount(prev => ({...prev, [player.id]: 0}));
        }
      });
    }
  };

  const startEditingPlayerName = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditPlayerName(player.name);
  };

  const savePlayerName = () => {
    if (editingPlayerId !== null && editPlayerName.trim()) {
      updatePlayerName(editingPlayerId, editPlayerName.trim());
      setEditingPlayerId(null);
    }
  };

  const cancelEditingPlayerName = () => {
    setEditingPlayerId(null);
  };

  // Fix the handlePlayerNameClick function
  const handlePlayerNameClick = (player) => {
    setEditingPlayerId(player.id);
    setEditPlayerName(player.name);
  };

  return (
    <div className="p-4">
      {/* Sync Button with Connection Status and Save Status */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {isConnected === true && (
            <div className="flex items-center gap-2 text-success">
              <Icon icon="lucide:wifi" />
              <span>Подключено к Firebase</span>
            </div>
          )}
          {isConnected === false && (
            <div className="flex items-center gap-2 text-danger">
              <Icon icon="lucide:wifi-off" />
              <span>Нет подключения к Firebase</span>
            </div>
          )}
          {isConnected === null && (
            <div className="flex items-center gap-2 text-default-500">
              <Icon icon="lucide:loader" className="animate-spin" />
              <span>Проверка подключения...</span>
            </div>
          )}
          
          {/* Add save status indicator */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-default-500 ml-4">
              <Icon icon="lucide:loader" className="animate-spin" />
              <span>Сохранение...</span>
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-success ml-4">
              <Icon icon="lucide:check" />
              <span>Сохранено</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-danger ml-4">
              <Icon icon="lucide:alert-triangle" />
              <span>Ошибка сохранения</span>
            </div>
          )}
        </div>
        
        <Button 
          color="primary" 
          variant="flat" 
          onPress={syncData}
          startContent={<Icon icon="lucide:refresh-cw" />}
          isDisabled={isConnected === false}
        >
          Синхронизировать данные
        </Button>
      </div>
      
      {/* Player Management Card */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Управление игроками</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Имя игрока"
              value={newPlayerName || ""}
              onValueChange={setNewPlayerName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddPlayer();
                }
              }}
              className="w-48 md:w-64"
            />
            <Button color="primary" onPress={handleAddPlayer}>
              <Icon icon="lucide:plus" className="mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <Table removeWrapper aria-label="Список игроков">
              <TableHeader>
                <TableColumn>Игрок</TableColumn>
                <TableColumn>Фишки</TableColumn>
                <TableColumn>Баунти</TableColumn>
                <TableColumn>Оплата</TableColumn>
                <TableColumn>Статус</TableColumn>
                <TableColumn>Действия</TableColumn>
              </TableHeader>
              <TableBody emptyContent="Нет зарегистрированных игроков">
                {(state.players || []).map((player) => {
                  const totalChips = 
                    (player.initialChips || 0) + 
                    ((player.rebuys || 0) * (state.rebuyChips || 0)) + 
                    ((player.addons || 0) * (state.addonChips || 0));
                    
                  const totalCost = 
                    (state.entryFee || 0) + 
                    ((player.rebuys || 0) * (state.rebuyFee || 0)) + 
                    ((player.addons || 0) * (state.addonFee || 0));
                    
                  const remainingToPay = totalCost - (player.paidAmount || 0);
                    
                  return (
                    <TableRow key={player.id} className={player.isEliminated ? "opacity-60" : ""}>
                      <TableCell>
                        {editingPlayerId === player.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              size="sm"
                              value={editPlayerName}
                              onValueChange={setEditPlayerName}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  savePlayerName();
                                } else if (e.key === "Escape") {
                                  cancelEditingPlayerName();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              isIconOnly
                              color="success"
                              variant="light"
                              onPress={savePlayerName}
                            >
                              <Icon icon="lucide:check" size={16} />
                            </Button>
                            <Button
                              size="sm"
                              isIconOnly
                              color="danger"
                              variant="light"
                              onPress={cancelEditingPlayerName}
                            >
                              <Icon icon="lucide:x" size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{player.name}</span>
                            <Button
                              size="sm"
                              isIconOnly
                              color="default"
                              variant="light"
                              onPress={() => handlePlayerNameClick(player)}
                            >
                              <Icon icon="lucide:edit-2" size={16} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold">{totalChips.toLocaleString()}</div>
                          <div className="text-xs text-default-500">
                            Вход: {player.initialChips?.toLocaleString() || 0} | 
                            Ребаи: {(player.rebuys || 0)} × {state.rebuyChips?.toLocaleString() || 0} | 
                            Аддоны: {(player.addons || 0)} × {state.addonChips?.toLocaleString() || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{player.bountyChips || 0}</div>
                          {!player.isEliminated && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                isIconOnly
                                color="danger"
                                variant="flat"
                                onPress={() => handleUpdateBounty(player, Math.max(0, (player.bountyChips || 0) - 1))}
                              >
                                <Icon icon="lucide:minus" />
                              </Button>
                              <Input
                                type="number"
                                size="sm"
                                min={0}
                                value={(player.bountyChips || 0).toString()}
                                onValueChange={(value) => 
                                  handleUpdateBounty(player, Number(value) || 0)
                                }
                                className="w-16"
                              />
                              <Button
                                size="sm"
                                isIconOnly
                                color="success"
                                variant="flat"
                                onPress={() => handleUpdateBounty(player, (player.bountyChips || 0) + 1)}
                              >
                                <Icon icon="lucide:plus" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              <div className="font-medium">
                                {remainingToPay > 0 ? (
                                  <span className="text-danger">
                                    Осталось: {remainingToPay.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-success">Оплачено полностью</span>
                                )}
                              </div>
                              <div className="text-xs text-default-500">
                                Оплачено: {player.paidAmount?.toLocaleString() || 0} из {totalCost.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {remainingToPay > 0 && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                size="sm"
                                min={1}
                                max={remainingToPay}
                                value={(paymentAmount[player.id] || remainingToPay).toString()}
                                onValueChange={(value) => 
                                  setPaymentAmount(prev => ({
                                    ...prev, 
                                    [player.id]: Number(value) || 0
                                  }))
                                }
                                className="w-24"
                                placeholder="Сумма"
                              />
                              <Button
                                size="sm"
                                color="success"
                                variant="flat"
                                onPress={() => handleRecordPayment(player)}
                                isDisabled={(paymentAmount[player.id] || 0) <= 0}
                                startContent={<Icon icon="lucide:credit-card" className="text-sm" />}
                              >
                                Оплата
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {player.isEliminated ? (
                          <span className="text-danger flex items-center gap-1">
                            <Icon icon="lucide:x-circle" className="text-sm" />
                            Выбыл (#{player.eliminationOrder})
                          </span>
                        ) : (
                          <span className="text-success flex items-center gap-1">
                            <Icon icon="lucide:check-circle" className="text-sm" />
                            В игре
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {!player.isEliminated ? (
                            <div className="flex flex-wrap gap-1">
                              <Button 
                                size="sm" 
                                color="primary" 
                                variant="flat"
                                onPress={() => handleAddRebuy(player)}
                              >
                                Ребай
                              </Button>
                              <Button 
                                size="sm" 
                                color="secondary" 
                                variant="flat"
                                onPress={() => handleAddAddon(player)}
                              >
                                Аддон
                              </Button>
                              <Button 
                                size="sm" 
                                color="danger" 
                                variant="flat"
                                onPress={() => handleEliminatePlayer(player)}
                              >
                                Выбыл
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              color="success" 
                              variant="flat"
                              onPress={() => handleRevivePlayer(player)}
                              startContent={<Icon icon="lucide:undo" />}
                            >
                              Вернуть с ребаем
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            isIconOnly 
                            color="danger" 
                            variant="light"
                            onPress={() => handleRemovePlayer(player)}
                          >
                            <Icon icon="lucide:trash-2" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};