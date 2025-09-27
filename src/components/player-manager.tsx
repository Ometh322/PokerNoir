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
import type { Player } from "./tournament-context";


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
    syncData
  } = useTournament();
  
  const [newPlayerName, setNewPlayerName] = React.useState("");
  const [bountyAmount, setBountyAmount] = React.useState<Record<number, number>>({});
  const [paymentAmount, setPaymentAmount] = React.useState<Record<number, number>>({});
  const { confirm, dialog } = useConfirmation();
  
  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName("");
    }
  };

  const handleRemovePlayer = (player: Player) => {
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

  const handleAddRebuy = (player: Player) => {
    confirm({
      title: "Подтверждение ребая",
      message: `Добавить ребай для игрока "${player.name}"? Будет добавлено ${state.rebuyChips.toLocaleString()} фишек.`,
      confirmLabel: "Добавить ребай",
      cancelLabel: "Отмена",
      confirmColor: "primary",
      icon: "lucide:refresh-cw",
      onConfirm: () => addRebuy(player.id)
    });
  };

  const handleAddAddon = (player: Player) => {
    confirm({
      title: "Подтверждение аддона",
      message: `Добавить аддон для игрока "${player.name}"? Будет добавлено ${state.addonChips.toLocaleString()} фишек.`,
      confirmLabel: "Добавить аддон",
      cancelLabel: "Отмена",
      confirmColor: "primary",
      icon: "lucide:plus-circle",
      onConfirm: () => addAddon(player.id)
    });
  };

  const handleEliminatePlayer = (player: Player) => {
    confirm({
      title: "Подтверждение выбывания",
      message: `Отметить игрока "${player.name}" как выбывшего из турнира?`,
      confirmLabel: "Подтвердить выбывание",
      cancelLabel: "Отмена",
      confirmColor: "danger",
      icon: "lucide:x-circle",
      onConfirm: () => eliminatePlayer(player.id)
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

  const handleAddBounty = (player: Player) => {
    const amount = bountyAmount[player.id] || 1;
    addBountyChips(player.id, amount);
    setBountyAmount(prev => ({...prev, [player.id]: 1})); // Reset to 1 after adding
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

  return (
    <div className="p-4">
      {dialog}
      
      {/* Sync Button */}
      <div className="flex justify-end mb-4">
        <Button 
          color="primary" 
          variant="flat" 
          onPress={syncData}
          startContent={<Icon icon="lucide:refresh-cw" />}
        >
          Синхронизировать данные
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Управление игроками</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Имя игрока"
              value={newPlayerName}
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
                    player.initialChips + 
                    (player.rebuys * state.rebuyChips) + 
                    (player.addons * state.addonChips);
                    
                  const totalCost = 
                    state.entryFee + 
                    (player.rebuys * state.rebuyFee) + 
                    (player.addons * state.addonFee);
                    
                  const remainingToPay = totalCost - (player.paidAmount || 0);
                    
                  return (
                    <TableRow key={player.id} className={player.isEliminated ? "opacity-60" : ""}>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold">{totalChips.toLocaleString()}</div>
                          <div className="text-xs text-default-500">
                            Вход: {player.initialChips.toLocaleString()} | 
                            Ребаи: {player.rebuys} × {state.rebuyChips.toLocaleString()} | 
                            Аддоны: {player.addons} × {state.addonChips.toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{player.bountyChips || 0}</div>
                          {!player.isEliminated && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                size="sm"
                                min={1}
                                value={(bountyAmount[player.id] || 1).toString()}
                                onValueChange={(value) => 
                                  setBountyAmount(prev => ({
                                    ...prev, 
                                    [player.id]: Number(value) || 1
                                  }))
                                }
                                className="w-16"
                              />
                              <Button
                                size="sm"
                                isIconOnly
                                color="success"
                                variant="flat"
                                onPress={() => handleAddBounty(player)}
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